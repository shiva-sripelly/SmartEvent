import os
from datetime import datetime
from uuid import uuid4

import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import SessionLocal, get_db
from app.models import Booking, Event, Notification, Payment, Ticket, User, Wishlist
from app.routes.coupons import validate_coupon_for_amount
from app.schemas import PaymentResponse, PaymentSimulationRequest
from app.utils.email import send_email
from app.utils.connection_manager import manager
from app.utils.event_status import expire_past_events, is_event_bookable
from app.utils.qr import generate_qr_code

load_dotenv("backend.env")

router = APIRouter(prefix="/payments", tags=["Payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
        )
    )


def reserve_event_tickets(db: Session, event: Event, quantity: int) -> int:
    updated_rows = (
        db.query(Event)
        .filter(Event.id == event.id, Event.available_tickets >= quantity)
        .update(
            {Event.available_tickets: Event.available_tickets - quantity},
            synchronize_session=False,
        )
    )

    if updated_rows != 1:
        db.rollback()
        db.refresh(event)
        raise HTTPException(
            status_code=400,
            detail=f"Only {event.available_tickets} tickets available",
        )

    db.flush()
    db.refresh(event)
    return event.available_tickets


def create_pending_booking_and_payment(
    db: Session,
    event: Event,
    user: User,
    quantity: int,
    payment_method: str,
    coupon_code: str | None = None,
) -> tuple[Booking, Payment]:
    total_price = quantity * event.ticket_price
    coupon = None
    discount_amount = 0
    final_amount = total_price

    if coupon_code:
        coupon, discount_amount, final_amount = validate_coupon_for_amount(
            db,
            coupon_code,
            total_price,
        )

    reserve_event_tickets(db, event, quantity)

    booking = Booking(
        user_id=user.id,
        event_id=event.id,
        ticket_quantity=quantity,
        total_price=total_price,
        coupon_id=coupon.id if coupon else None,
        discount_amount=discount_amount,
        final_amount=final_amount,
        booking_status="PENDING",
    )
    db.query(Wishlist).filter(
        Wishlist.user_id == user.id,
        Wishlist.event_id == event.id,
    ).delete()

    db.add(booking)
    db.commit()
    db.refresh(booking)

    payment = Payment(
        booking_id=booking.id,
        payment_method=payment_method,
        payment_status="PENDING",
        transaction_id=f"PENDING-{uuid4().hex}",
        amount=final_amount,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return booking, payment


def confirm_payment(db: Session, payment: Payment, transaction_id: str | None = None) -> Booking:
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if payment.payment_status == "SUCCESS" and booking.booking_status == "CONFIRMED":
        return booking

    event = db.query(Event).filter(Event.id == booking.event_id).first()
    user = db.query(User).filter(User.id == booking.user_id).first()
    if not event or not user:
        raise HTTPException(status_code=404, detail="Booking owner or event not found")

    if not is_event_bookable(event, datetime.now()):
        if booking.booking_status == "PENDING":
            fail_payment(db, payment)
        raise HTTPException(
            status_code=400,
            detail="This event is no longer available for booking.",
        )

    payment.payment_status = "SUCCESS"
    payment.transaction_id = transaction_id or f"SIM-{uuid4().hex}"
    booking.booking_status = "CONFIRMED"
    booking.final_amount = booking.final_amount if booking.final_amount is not None else booking.total_price

    if booking.coupon:
        booking.coupon.used_count += 1

    existing_ticket = db.query(Ticket).filter(Ticket.booking_id == booking.id).first()
    if not existing_ticket:
        ticket_code, qr_path = generate_qr_code()
        db.add(Ticket(booking_id=booking.id, ticket_code=ticket_code, qr_code_url=qr_path))
    else:
        ticket_code = existing_ticket.ticket_code

    create_notification(
        db,
        user.id,
        "Payment Successful",
        f"Your payment for {event.title} was successful and your booking is confirmed.",
        "PAYMENT",
    )
    create_notification(
        db,
        user.id,
        "Booking Confirmed",
        f"Your booking for {event.title} has been confirmed.",
        "BOOKING",
    )
    db.commit()

    event_date = event.event_date.strftime("%d %B %Y, %I:%M %p")
    send_email(
        to_email=user.email,
        subject=f"Payment Successful - {event.title}",
        message=f"""
Hello {user.username},

Your SmartEvent payment was successful and your booking is confirmed.

Event: {event.title}
Location: {event.location}
Event Date: {event_date}
Tickets Booked: {booking.ticket_quantity}
Total: Rs.{booking.total_price}
Discount: Rs.{booking.discount_amount}
Final Amount Paid: Rs.{booking.final_amount}
Ticket Code: {ticket_code}

Regards,
SmartEvent Team
""",
    )
    return booking


def fail_payment(db: Session, payment: Payment) -> Booking:
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    event = db.query(Event).filter(Event.id == booking.event_id).first()
    if event and booking.booking_status == "PENDING":
        event.available_tickets += booking.ticket_quantity

    payment.payment_status = "FAILED"
    payment.transaction_id = payment.transaction_id or f"FAILED-{uuid4().hex}"
    booking.booking_status = "FAILED"
    create_notification(
        db,
        booking.user_id,
        "Payment Failed",
        "Your payment could not be completed. No ticket was issued.",
        "PAYMENT",
    )
    db.commit()
    return booking


@router.post("/create-checkout-session")
def create_checkout_session(
    event_id: int,
    quantity: int,
    background_tasks: BackgroundTasks,
    coupon_code: str | None = None,
    use_simulation: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expire_past_events(db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    now = datetime.now()
    if not is_event_bookable(event, now):
        raise HTTPException(status_code=400, detail="This event is no longer available for booking.")

    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid ticket quantity")

    if event.available_tickets < quantity:
        if background_tasks:
            background_tasks.add_task(
                manager.broadcast_availability,
                event.id,
                event.available_tickets,
                event.status,
            )
        raise HTTPException(status_code=400, detail="Not enough tickets available")

    booking, payment = create_pending_booking_and_payment(
        db,
        event,
        current_user,
        quantity,
        "STRIPE",
        coupon_code,
    )

    if background_tasks:
        background_tasks.add_task(
            manager.broadcast_availability,
            event.id,
            event.available_tickets,
            event.status,
        )

    if use_simulation or not stripe.api_key:
        return {
            "checkout_url": f"{FRONTEND_URL}/checkout/{booking.id}?payment_id={payment.id}",
            "booking_id": booking.id,
            "payment_id": payment.id,
            "message": "Use simulated checkout.",
        }

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        customer_email=current_user.email,
        client_reference_id=str(payment.id),
        metadata={
            "booking_id": str(booking.id),
            "payment_id": str(payment.id),
            "event_id": str(event.id),
            "quantity": str(quantity),
            "user_id": str(current_user.id),
        },
        line_items=[
            {
                "price_data": {
                    "currency": "inr",
                    "product_data": {
                        "name": event.title,
                        "description": event.location,
                    },
                    "unit_amount": int(payment.amount * 100),
                },
                "quantity": 1,
            }
        ],
        success_url=f"{FRONTEND_URL}/payment-success?payment_id={payment.id}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/checkout/{booking.id}?payment_id={payment.id}&status=cancelled",
    )

    return {
        "checkout_url": session.url,
        "booking_id": booking.id,
        "payment_id": payment.id,
    }


@router.post("/verify-stripe-session/{payment_id}", response_model=PaymentResponse)
def verify_stripe_session(
    payment_id: int,
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).join(Booking).filter(
        Payment.id == payment_id,
        Booking.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.payment_status == "SUCCESS":
        return payment

    if not stripe.api_key:
        raise HTTPException(status_code=400, detail="Stripe is not configured")

    session = stripe.checkout.Session.retrieve(session_id)
    session_metadata = session.get("metadata") or getattr(session, "metadata", {}) or {}
    session_payment_id = (
        session_metadata.get("payment_id")
        if hasattr(session_metadata, "get")
        else None
    )
    session_reference_id = session.get("client_reference_id") or getattr(
        session,
        "client_reference_id",
        None,
    )
    if str(session_payment_id or session_reference_id) != str(payment.id):
        raise HTTPException(status_code=400, detail="Stripe session does not match this payment")

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Stripe payment is not completed")

    confirm_payment(
        db,
        payment,
        session.payment_intent or f"STRIPE-{session.id}",
    )
    db.refresh(payment)
    return payment


@router.post("/simulate", response_model=PaymentResponse)
def simulate_payment(
    request: PaymentSimulationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(
        Booking.id == request.booking_id,
        Booking.user_id == current_user.id,
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
    if not payment:
        payment = Payment(
            booking_id=booking.id,
            payment_method=request.payment_method,
            payment_status="PENDING",
            transaction_id=f"PENDING-{uuid4().hex}",
            amount=booking.final_amount if booking.final_amount is not None else booking.total_price,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

    payment.payment_method = request.payment_method
    if request.succeed:
        confirm_payment(db, payment, f"SIM-{uuid4().hex}")
    else:
        fail_payment(db, payment)

    db.refresh(payment)
    booking_event = db.query(Event).filter(Event.id == booking.event_id).first()
    if booking_event:
        background_tasks.add_task(
            manager.broadcast_availability,
            booking_event.id,
            booking_event.available_tickets,
            booking_event.status,
        )
    return payment


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = db.query(Payment).join(Booking).filter(
        Payment.id == payment_id,
        Booking.user_id == current_user.id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        stripe_event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            endpoint_secret,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if stripe_event["type"] == "checkout.session.completed":
        session = stripe_event["data"]["object"]
        payment_id = int(session["metadata"]["payment_id"])

        db = SessionLocal()
        try:
            payment = db.query(Payment).filter(Payment.id == payment_id).first()
            if payment:
                confirm_payment(
                    db,
                    payment,
                    session.payment_intent or f"STRIPE-{session.id}",
                )
        finally:
            db.close()

    return {"status": "success"}
