from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import Coupon, Event, Booking, User, Ticket, Notification, Payment
from app.schemas import BookingCreate, BookingResponse
from app.core.security import get_current_user, require_roles
from app.utils.event_status import expire_past_events
from app.utils.qr import generate_qr_code
from app.utils.email import send_email


router = APIRouter(prefix="/bookings", tags=["Bookings"])


def serialize_booking(booking: Booking) -> dict:
    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "event_id": booking.event_id,
        "ticket_quantity": booking.ticket_quantity,
        "total_price": booking.total_price,
        "coupon_id": booking.coupon_id,
        "discount_amount": booking.discount_amount or 0,
        "final_amount": booking.final_amount,
        "booking_status": booking.booking_status,
        "event_status": booking.event.status if booking.event else None,
        "event_date": booking.event.event_date if booking.event else None,
    }


@router.post("/", response_model=BookingResponse)
def book_ticket(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expire_past_events(db)
    event = db.query(Event).filter(Event.id == booking.event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    now = datetime.now()
    if event.status in ["CANCELLED", "COMPLETED"] or event.event_date < now:
        raise HTTPException(
            status_code=400,
            detail="This event is no longer available for booking."
        )

    if booking.ticket_quantity <= 0:
        raise HTTPException(status_code=400, detail="Ticket quantity must be greater than 0")

    if event.available_tickets <= 0:
        raise HTTPException(status_code=400, detail="Tickets sold out")

    if booking.ticket_quantity > event.available_tickets:
        raise HTTPException(status_code=400, detail="Not enough tickets available")

    total_price = booking.ticket_quantity * event.ticket_price
    coupon = None
    discount_amount = 0
    final_amount = total_price

    if booking.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.coupon_code == booking.coupon_code.strip().upper()
        ).first()
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        if not coupon.is_active:
            raise HTTPException(status_code=400, detail="Coupon is not active")
        if coupon.expiry_date < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Coupon has expired")
        if coupon.used_count >= coupon.usage_limit:
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")
        if total_price < coupon.minimum_booking_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum booking amount is {coupon.minimum_booking_amount}"
            )
        if coupon.discount_type == "PERCENTAGE":
            discount_amount = min(total_price, total_price * (coupon.discount_value / 100))
        elif coupon.discount_type == "FIXED":
            discount_amount = min(total_price, coupon.discount_value)
        else:
            raise HTTPException(status_code=400, detail="Invalid coupon discount type")
        final_amount = max(0, total_price - discount_amount)

    new_booking = Booking(
        user_id=current_user.id,
        event_id=event.id,
        ticket_quantity=booking.ticket_quantity,
        total_price=total_price,
        coupon_id=coupon.id if coupon else None,
        discount_amount=discount_amount,
        final_amount=final_amount,
        booking_status="CONFIRMED"
    )

    event.available_tickets -= booking.ticket_quantity
    if coupon:
        coupon.used_count += 1

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    payment = Payment(
        booking_id=new_booking.id,
        payment_method="DIRECT",
        payment_status="SUCCESS",
        transaction_id=f"DIRECT-{new_booking.id}-{int(datetime.utcnow().timestamp())}",
        amount=final_amount
    )

    db.add(payment)
    db.commit()

    # Generate QR Ticket
    ticket_code, qr_path = generate_qr_code()

    ticket = Ticket(
        booking_id=new_booking.id,
        ticket_code=ticket_code,
        qr_code_url=qr_path
    )

    db.add(ticket)
    db.commit()

    notification_message = (
        f"Your booking for {event.title} has been confirmed. "
        f"You booked {booking.ticket_quantity} ticket(s)."
    )

    notification = Notification(
        user_id=current_user.id,
        title="Booking Confirmed",
        message=notification_message,
        type="BOOKING"
    )

    db.add(notification)
    db.commit()

    payment_notification = Notification(
        user_id=current_user.id,
        title="Payment Successful",
        message=f"Payment of Rs.{final_amount} for {event.title} was successful.",
        type="PAYMENT"
    )

    db.add(payment_notification)
    db.commit()

    event_date = event.event_date.strftime("%d %B %Y, %I:%M %p")

    email_message = f"""
Hello {current_user.username},

Your SmartEvent booking has been confirmed successfully!

Here are your booking details:

----------------------------------------
Event Name: {event.title}
Description: {event.description}
Category: {event.category}
Location: {event.location}
Event Date: {event_date}
Tickets Booked: {booking.ticket_quantity}
Ticket Price: ₹{event.ticket_price}
Total Amount Paid: ₹{total_price}
Ticket Code: {ticket_code}
----------------------------------------

Your QR ticket has been generated successfully.
Please carry your digital ticket or QR code while attending the event.

Important Instructions:
1. Please arrive at least 30 minutes before the event starts.
2. Keep your ticket code or QR code ready at the entry gate.
3. This ticket is valid only for the registered event.
4. You will receive a reminder email before the event date.

Thank you for choosing SmartEvent.

Regards,
SmartEvent Team
"""

    send_email(
        to_email=current_user.email,
        subject=f"Booking Confirmed - {event.title}",
        message=email_message
    )

    return new_booking


@router.get("/my-bookings", response_model=List[BookingResponse])
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.created_at.desc(), Booking.id.desc())
        .all()
    )
    return [serialize_booking(booking) for booking in bookings]


@router.get("/organizer", response_model=List[BookingResponse])
def organizer_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN"))
):
    return db.query(Booking).join(Event).filter(Event.created_by == current_user.id).all()


@router.get("/event/{event_id}", response_model=List[BookingResponse])
def event_bookings(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN"))
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == "ORGANIZER" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view bookings for this event")

    return db.query(Booking).filter(Booking.event_id == event_id).all()
