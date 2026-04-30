from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import Event, Booking, User, Ticket, Notification
from app.schemas import BookingCreate, BookingResponse
from app.core.security import get_current_user, require_roles
from app.utils.event_status import expire_past_events
from app.utils.qr import generate_qr_code
from app.utils.email import send_email


router = APIRouter(prefix="/bookings", tags=["Bookings"])


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

    new_booking = Booking(
        user_id=current_user.id,
        event_id=event.id,
        ticket_quantity=booking.ticket_quantity,
        total_price=total_price,
        booking_status="CONFIRMED"
    )

    event.available_tickets -= booking.ticket_quantity

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

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
    return db.query(Booking).filter(Booking.user_id == current_user.id).all()


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