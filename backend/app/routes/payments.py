import os
import stripe
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db, SessionLocal
from app.models import Event, User, Booking, Ticket, Notification
from app.core.security import get_current_user
from app.utils.event_status import expire_past_events
from app.utils.qr import generate_qr_code
from app.utils.email import send_email

load_dotenv("backend.env")

router = APIRouter(prefix="/payments", tags=["Payments"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.post("/create-checkout-session")
def create_checkout_session(
    event_id: int,
    quantity: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expire_past_events(db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    now = datetime.now()
    if event.status in ["CANCELLED", "COMPLETED"] or event.event_date < now:
        raise HTTPException(status_code=400, detail="This event is no longer available for booking.")
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid ticket quantity")

    if event.available_tickets < quantity:
        raise HTTPException(status_code=400, detail="Not enough tickets available")

    amount = int(event.ticket_price * 100)

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        customer_email=current_user.email,
        metadata={
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
                    "unit_amount": amount,
                },
                "quantity": quantity,
            }
        ],
        success_url=f"{FRONTEND_URL}/payment-success",
        cancel_url=f"{FRONTEND_URL}/events/{event.id}",
    )

    return {"checkout_url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        stripe_event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if stripe_event["type"] == "checkout.session.completed":
        session = stripe_event["data"]["object"]

        event_id = int(session["metadata"]["event_id"])
        quantity = int(session["metadata"]["quantity"])
        user_id = int(session["metadata"]["user_id"])

        db = SessionLocal()

        try:
            expire_past_events(db)
            user = db.query(User).filter(User.id == user_id).first()
            event_obj = db.query(Event).filter(Event.id == event_id).first()

            if not user or not event_obj:
                return {"status": "user or event not found"}

            now = datetime.now()
            if event_obj.status in ["CANCELLED", "COMPLETED"] or event_obj.event_date < now:
                return {"status": "event expired or inactive"}

            if event_obj.available_tickets < quantity:
                return {"status": "not enough tickets"}

            total_price = quantity * event_obj.ticket_price

            booking = Booking(
                user_id=user.id,
                event_id=event_obj.id,
                ticket_quantity=quantity,
                total_price=total_price,
                booking_status="CONFIRMED"
            )

            event_obj.available_tickets -= quantity

            db.add(booking)
            db.commit()
            db.refresh(booking)

            ticket_code, qr_path = generate_qr_code()

            ticket = Ticket(
                booking_id=booking.id,
                ticket_code=ticket_code,
                qr_code_url=qr_path
            )

            db.add(ticket)

            notification = Notification(
                user_id=user.id,
                title="Booking Confirmed",
                message=f"Your Stripe payment was successful for {event_obj.title}",
                type="BOOKING"
            )

            db.add(notification)
            db.commit()

            event_date = event_obj.event_date.strftime("%d %B %Y, %I:%M %p")

            email_message = f"""
Hello {user.username},

Your Stripe payment was successful and your SmartEvent booking is confirmed!

Booking Details:
----------------------------------------
Event Name: {event_obj.title}
Description: {event_obj.description}
Category: {event_obj.category}
Location: {event_obj.location}
Event Date: {event_date}
Tickets Booked: {quantity}
Ticket Price: ₹{event_obj.ticket_price}
Total Amount Paid: ₹{total_price}
Ticket Code: {ticket_code}
----------------------------------------

Your QR ticket has been generated successfully.
Please visit the Tickets page in SmartEvent to view or download your QR ticket.

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
                to_email=user.email,
                subject=f"Stripe Payment Successful - {event_obj.title}",
                message=email_message
            )

        finally:
            db.close()

    return {"status": "success"}