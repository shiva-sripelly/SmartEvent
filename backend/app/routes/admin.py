from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timedelta
import shutil

from sqlalchemy import func

from app.utils.email import send_email
from app.database import get_db
from app.models import Event, User, Booking, Notification
from app.schemas import EventResponse, BookingResponse, UserResponse
from app.core.security import get_current_user, require_roles
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/admin", tags=["Admin"])


def save_upload_file(upload_file: UploadFile) -> str:
    uploads_dir = Path("uploads")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    original_filename = Path(upload_file.filename).name
    stored_filename = f"{uuid4().hex}_{original_filename}"
    saved_path = uploads_dir / stored_filename

    with saved_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return f"http://127.0.0.1:8000/uploads/{stored_filename}"


def parse_event_date(date_string: str) -> datetime:
    formats = [
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %I:%M:%S%p",
        "%d/%m/%Y %I:%M%p",
        "%m/%d/%Y %I:%M:%S%p",
        "%m/%d/%Y %I:%M%p",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(date_string)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event_date format: {date_string}"
        )


@router.post("/events", response_model=EventResponse)
def add_event(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    event_date: str = Form(...),
    ticket_price: float = Form(...),
    banner_image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER"))
):
    banner_url = save_upload_file(banner_image)
    parsed_event_date = parse_event_date(event_date)

    new_event = Event(
        title=title,
        description=description,
        category=category,
        location=location,
        event_date=parsed_event_date,
        ticket_price=ticket_price,
        banner_image=banner_url,
        created_by=current_user.id,
        status="UPCOMING"
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    send_email(
        to_email=current_user.email,
        subject="Event Created Successfully",
        message=f"""
Hello {current_user.username},

Your event has been created successfully.

Event Details:
- Event: {new_event.title}
- Location: {new_event.location}
- Date: {new_event.event_date}
- Price: ₹{new_event.ticket_price}

Regards,
SmartEvent Team
"""
    )

    return new_event


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    location: str = Form(...),
    event_date: str = Form(...),
    ticket_price: float = Form(...),
    banner_image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN"))
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == "ORGANIZER" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    event.title = title
    event.description = description
    event.category = category
    event.location = location
    event.event_date = parse_event_date(event_date)
    event.ticket_price = ticket_price

    if banner_image is not None:
        event.banner_image = save_upload_file(banner_image)

    db.commit()
    db.refresh(event)

    attendees = (
        db.query(User)
        .join(Booking, Booking.user_id == User.id)
        .filter(Booking.event_id == event.id)
        .distinct()
        .all()
    )

    for attendee in attendees:
        notification_message = f"""
Hello {attendee.username},

The event you booked has been updated.

Event: {event.title}
Location: {event.location}
Date: {event.event_date}
Price: ₹{event.ticket_price}

Please review the updated event details in your SmartEvent account.

Regards,
SmartEvent Team
"""

        notification = Notification(
            user_id=attendee.id,
            title=f"Event Updated - {event.title}",
            message=notification_message,
            type="EVENT"
        )
        db.add(notification)

        send_email(
            to_email=attendee.email,
            subject=f"Event Updated - {event.title}",
            message=notification_message
        )

    db.commit()

    return event


@router.get("/events", response_model=List[EventResponse])
def get_admin_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN"))
):
    expire_past_events(db)
    if current_user.role == "ADMIN":
        return db.query(Event).all()
    return db.query(Event).filter(Event.created_by == current_user.id).all()


@router.get("/events/{event_id}/bookings", response_model=List[BookingResponse])
def get_event_bookings(
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


@router.get("/events/{event_id}/insights")
def get_event_insights(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN"))
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == "ORGANIZER" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view insights for this event")

    total_tickets = db.query(func.sum(Booking.ticket_quantity)).filter(Booking.event_id == event_id).scalar() or 0
    total_revenue = db.query(func.sum(Booking.total_price)).filter(Booking.event_id == event_id).scalar() or 0
    booking_count = db.query(Booking).filter(Booking.event_id == event_id).count()

    return {
        "event_id": event.id,
        "title": event.title,
        "total_tickets_sold": total_tickets,
        "remaining_tickets": event.available_tickets,
        "total_revenue": total_revenue,
        "booking_count": booking_count,
        "status": event.status,
    }


@router.put("/events/{event_id}/cancel")
def cancel_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN"))
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == "ORGANIZER" and event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    event.status = "CANCELLED"
    db.commit()

    attendees = (
        db.query(User)
        .join(Booking, Booking.user_id == User.id)
        .filter(Booking.event_id == event_id)
        .distinct()
        .all()
    )

    for attendee in attendees:
        notification_message = f"""
Hello {attendee.username},

We regret to inform you that the following event has been cancelled:

Event Details:
-------------------------
Event: {event.title}
Location: {event.location}
Date: {event.event_date}
-------------------------

Refund (if applicable) will be processed soon.

We apologize for the inconvenience.

Regards,
SmartEvent Team
"""

        notification = Notification(
            user_id=attendee.id,
            title=f"Event Cancelled - {event.title}",
            message=notification_message,
            type="EVENT"
        )
        db.add(notification)

        send_email(
            to_email=attendee.email,
            subject=f"Event Cancelled - {event.title}",
            message=notification_message
        )

    db.commit()

    return {"message": "Event cancelled and users notified"}


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expire_past_events(db)

    if current_user.role == "ADMIN":
        total_users = db.query(User).count()
        total_events = db.query(Event).count()
        total_bookings = db.query(Booking).count()
        total_revenue = db.query(func.sum(Booking.total_price)).scalar() or 0
        total_tickets = db.query(func.sum(Booking.ticket_quantity)).scalar() or 0

        daily_sales = [
            {
                "date": (datetime.utcnow() - timedelta(days=days)).date().isoformat(),
                "tickets_sold": db.query(func.sum(Booking.ticket_quantity)).filter(
                    func.date(Booking.created_at) == (datetime.utcnow() - timedelta(days=days)).date()
                ).scalar() or 0,
                "revenue": db.query(func.sum(Booking.total_price)).filter(
                    func.date(Booking.created_at) == (datetime.utcnow() - timedelta(days=days)).date()
                ).scalar() or 0,
            }
            for days in range(6, -1, -1)
        ]

        popular_events = [
            {
                "event_id": event.id,
                "title": event.title,
                "tickets_sold": db.query(func.sum(Booking.ticket_quantity)).filter(Booking.event_id == event.id).scalar() or 0,
            }
            for event in db.query(Event).order_by(Event.event_date.desc()).limit(10).all()
        ]

        top_revenue_events = [
            {
                "event_id": event.id,
                "title": event.title,
                "revenue": db.query(func.sum(Booking.total_price)).filter(Booking.event_id == event.id).scalar() or 0,
            }
            for event in db.query(Event).order_by(Event.event_date.desc()).limit(10).all()
        ]

        upcoming_events = db.query(Event).filter(
            Event.status == "UPCOMING"
        ).count()

        ongoing_events = db.query(Event).filter(
            Event.status == "ONGOING"
        ).count()

        cancelled_events = db.query(Event).filter(
            Event.status == "CANCELLED"
        ).count()

        completed_events = db.query(Event).filter(
            Event.status == "COMPLETED"
        ).count()

        active_events = upcoming_events + ongoing_events

        return {
            "total_users": total_users,
            "total_events": total_events,
            "active_events": active_events,
            "upcoming_events": upcoming_events,
            "ongoing_events": ongoing_events,
            "cancelled_events": cancelled_events,
            "completed_events": completed_events,
            "total_bookings": total_bookings,
            "total_revenue": total_revenue,
            "total_tickets_sold": total_tickets,
            "daily_sales": daily_sales,
            "popular_events": popular_events,
            "top_revenue_events": top_revenue_events,
        }

    total_events = db.query(Event).filter(
        Event.created_by == current_user.id
    ).count()

    upcoming_events = db.query(Event).filter(
        Event.created_by == current_user.id,
        Event.status == "UPCOMING"
    ).count()

    ongoing_events = db.query(Event).filter(
        Event.created_by == current_user.id,
        Event.status == "ONGOING"
    ).count()

    cancelled_events = db.query(Event).filter(
        Event.created_by == current_user.id,
        Event.status == "CANCELLED"
    ).count()

    total_bookings = db.query(Booking).join(Event).filter(
        Event.created_by == current_user.id
    ).count()

    total_revenue = db.query(func.sum(Booking.total_price)).join(Event).filter(
        Event.created_by == current_user.id
    ).scalar() or 0

    completed_events = db.query(Event).filter(
        Event.created_by == current_user.id,
        Event.status == "COMPLETED"
    ).count()

    active_events = upcoming_events + ongoing_events

    return {
        "total_events": total_events,
        "active_events": active_events,
        "upcoming_events": upcoming_events,
        "ongoing_events": ongoing_events,
        "cancelled_events": cancelled_events,
        "completed_events": completed_events,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue
    }


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    return db.query(User).all()


@router.get("/all-events", response_model=List[EventResponse])
def get_all_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    expire_past_events(db)
    return db.query(Event).all()


@router.get("/all-bookings", response_model=List[BookingResponse])
def get_all_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    return db.query(Booking).all()
