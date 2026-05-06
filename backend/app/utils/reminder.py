from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.models import Booking, Event, Notification, User
from app.utils.email import send_email
from app.utils.event_status import is_event_bookable


def send_event_reminders():
    db = SessionLocal()

    try:
        now = datetime.utcnow()
        reminder_time = now + timedelta(hours=24)

        bookings = db.query(Booking).filter(
            Booking.booking_status == "CONFIRMED"
        ).all()

        for booking in bookings:
            event = db.query(Event).filter(Event.id == booking.event_id).first()
            user = db.query(User).filter(User.id == booking.user_id).first()

            if not event or not user:
                continue

            if not is_event_bookable(event, now):
                continue

            if now <= event.event_date <= reminder_time:
                existing_notification = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.title == f"Event Reminder - {event.title}",
                    Notification.type == "EVENT"
                ).first()

                if not existing_notification:
                    db.add(Notification(
                        user_id=user.id,
                        title=f"Event Reminder - {event.title}",
                        message=f"{event.title} is coming soon at {event.location} on {event.event_date}.",
                        type="EVENT"
                    ))
                    db.commit()

                send_email(
                    to_email=user.email,
                    subject=f"Reminder: {event.title} is coming soon",
                    message=f"""
Hello {user.username},

This is a reminder for your upcoming event.

Event Details:
----------------------------------------
Event: {event.title}
Location: {event.location}
Date: {event.event_date}
Tickets: {booking.ticket_quantity}
----------------------------------------

Please arrive at least 30 minutes early and keep your QR ticket ready.

Regards,
SmartEvent Team
"""
                )

    finally:
        db.close()


def start_reminder_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(send_event_reminders, "interval", minutes=30)
    scheduler.start()
