from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
from uuid import uuid4
from datetime import datetime
import shutil

from app.utils.email import send_email
from app.database import get_db
from app.models import Event, User, Booking
from app.schemas import EventResponse
from app.core.security import get_current_user
from app.utils.event_status import expire_past_events
from sqlalchemy import func

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
    # Accept several common datetime formats from frontend and manual entry.
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
    current_user: User = Depends(get_current_user)
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
        status="ACTIVE"
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
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.created_by != current_user.id:
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

    return event


@router.get("/events", response_model=List[EventResponse])
def get_admin_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expire_past_events(db)
    return db.query(Event).filter(Event.created_by == current_user.id).all()


@router.put("/events/{event_id}/cancel")
def cancel_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    event.status = "CANCELLED"
    db.commit()

    bookings = db.query(Booking).filter(Booking.event_id == event_id).all()

    for booking in bookings:
        user = db.query(User).filter(User.id == booking.user_id).first()

        if user:
            send_email(
                to_email=user.email,
                subject=f"Event Cancelled - {event.title}",
                message=f"""
Hello {user.username},

We regret to inform you that the following event has been cancelled:

Event Details:
-------------------------
Event: {event.title}
Location: {event.location}
Date: {event.event_date}
Tickets Booked: {booking.ticket_quantity}
-------------------------

Refund (if applicable) will be processed soon.

We apologize for the inconvenience.

Regards,
SmartEvent Team
"""
            )

    return {"message": "Event cancelled and users notified"}


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expire_past_events(db)

    total_events = db.query(Event).filter(
        Event.created_by == current_user.id
    ).count()

    active_events = db.query(Event).filter(
        Event.created_by == current_user.id,
        Event.status == "ACTIVE"
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

    return {
        "total_events": total_events,
        "active_events": active_events,
        "cancelled_events": cancelled_events,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue
    }