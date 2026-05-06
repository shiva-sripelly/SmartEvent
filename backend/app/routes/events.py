from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Booking, Event, Review, User
from app.schemas import EventCreate, EventResponse
from app.core.security import require_roles
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/events", tags=["Events"])


def event_with_rating(db: Session, event: Event) -> Event:
    average_rating = db.query(func.avg(Review.rating)).filter(
        Review.event_id == event.id
    ).scalar()
    reviews_count = db.query(Review).filter(Review.event_id == event.id).count()
    event.average_rating = round(float(average_rating), 2) if average_rating else 0
    event.reviews_count = reviews_count
    return event


@router.post("/", response_model=EventResponse)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER"))
):
    new_event = Event(**event.dict(), created_by=current_user.id, status="UPCOMING")
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


@router.get("/", response_model=List[EventResponse])
def get_events(db: Session = Depends(get_db)):
    expire_past_events(db)
    return [event_with_rating(db, event) for event in db.query(Event).all()]

@router.get("/search/", response_model=List[EventResponse])
def search_events(title: str = "", db: Session = Depends(get_db)):
    expire_past_events(db)
    return [
        event_with_rating(db, event)
        for event in db.query(Event).filter(Event.title.ilike(f"%{title}%")).all()
    ]


@router.get("/advanced-search/", response_model=List[EventResponse])
def advanced_search_events(
    title: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    sort_by: str = "date",
    db: Session = Depends(get_db),
):
    expire_past_events(db)

    query = db.query(Event)

    if title:
        query = query.filter(Event.title.ilike(f"%{title}%"))
    if category:
        query = query.filter(Event.category.ilike(f"%{category}%"))
    if location:
        query = query.filter(Event.location.ilike(f"%{location}%"))
    if start_date:
        query = query.filter(Event.event_date >= start_date)
    if end_date:
        query = query.filter(Event.event_date <= end_date)

    if sort_by == "price":
        query = query.order_by(Event.ticket_price.asc())
    elif sort_by == "popularity":
        query = query.outerjoin(Booking).group_by(Event.id).order_by(
            func.coalesce(func.sum(Booking.ticket_quantity), 0).desc()
        )
    else:
        query = query.order_by(Event.event_date.asc())

    return [event_with_rating(db, event) for event in query.all()]


@router.get("/category/{category_name}", response_model=List[EventResponse])
def filter_by_category(category_name: str, db: Session = Depends(get_db)):
    expire_past_events(db)
    return [
        event_with_rating(db, event)
        for event in db.query(Event).filter(Event.category.ilike(category_name)).all()
    ]

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    expire_past_events(db)
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_with_rating(db, event)
