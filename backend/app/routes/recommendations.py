from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models import Booking, Event, Review, User, UserEventView
from app.schemas import EventResponse
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


def event_with_rating(db: Session, event: Event) -> Event:
    average_rating = db.query(func.avg(Review.rating)).filter(
        Review.event_id == event.id
    ).scalar()
    reviews_count = db.query(Review).filter(Review.event_id == event.id).count()
    event.average_rating = round(float(average_rating), 2) if average_rating else 0
    event.reviews_count = reviews_count
    return event


def active_events_query(db: Session):
    return db.query(Event).filter(
        Event.status != "CANCELLED",
        Event.event_date >= datetime.utcnow(),
    )


def popularity_map(db: Session) -> dict[int, int]:
    rows = (
        db.query(Booking.event_id, func.coalesce(func.sum(Booking.ticket_quantity), 0))
        .group_by(Booking.event_id)
        .all()
    )
    return {event_id: int(total or 0) for event_id, total in rows}


def trending_events(db: Session, limit: int = 8) -> List[Event]:
    ticket_totals = (
        db.query(
            Booking.event_id.label("event_id"),
            func.coalesce(func.sum(Booking.ticket_quantity), 0).label("tickets_booked"),
        )
        .group_by(Booking.event_id)
        .subquery()
    )

    events = (
        active_events_query(db)
        .outerjoin(ticket_totals, Event.id == ticket_totals.c.event_id)
        .order_by(
            func.coalesce(ticket_totals.c.tickets_booked, 0).desc(),
            Event.created_at.desc(),
            Event.event_date.asc(),
        )
        .limit(limit)
        .all()
    )

    return [event_with_rating(db, event) for event in events]


@router.post("/view/{event_id}")
def track_event_view(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing_view = (
        db.query(UserEventView)
        .filter(
            UserEventView.user_id == current_user.id,
            UserEventView.event_id == event_id,
        )
        .first()
    )

    if existing_view:
        existing_view.view_count = (existing_view.view_count or 0) + 1
        existing_view.updated_at = datetime.utcnow()
    else:
        db.add(UserEventView(user_id=current_user.id, event_id=event_id))

    db.commit()
    return {"message": "Event view tracked"}


@router.get("/trending", response_model=List[EventResponse])
def get_trending_events(db: Session = Depends(get_db)):
    expire_past_events(db)
    return trending_events(db)


@router.get("/personalized", response_model=List[EventResponse])
def get_personalized_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expire_past_events(db)

    booked_events = (
        db.query(Event)
        .join(Booking, Booking.event_id == Event.id)
        .filter(Booking.user_id == current_user.id)
        .all()
    )
    viewed_rows = (
        db.query(UserEventView, Event)
        .join(Event, Event.id == UserEventView.event_id)
        .filter(UserEventView.user_id == current_user.id)
        .all()
    )

    preferred_categories = {}
    preferred_locations = {}
    booked_event_ids = set()

    for event in booked_events:
        booked_event_ids.add(event.id)
        if event.category:
            preferred_categories[event.category.lower()] = (
                preferred_categories.get(event.category.lower(), 0) + 3
            )
        if event.location:
            preferred_locations[event.location.lower()] = (
                preferred_locations.get(event.location.lower(), 0) + 2
            )

    for view, event in viewed_rows:
        view_weight = max(view.view_count or 1, 1)
        if event.category:
            preferred_categories[event.category.lower()] = (
                preferred_categories.get(event.category.lower(), 0) + view_weight
            )
        if event.location:
            preferred_locations[event.location.lower()] = (
                preferred_locations.get(event.location.lower(), 0) + view_weight
            )

    if not preferred_categories and not preferred_locations:
        return trending_events(db)

    booked_counts = popularity_map(db)
    candidate_events = active_events_query(db).all()

    scored_events = []
    for event in candidate_events:
        if event.id in booked_event_ids:
            continue

        score = 0
        if event.category:
            score += preferred_categories.get(event.category.lower(), 0) * 4
        if event.location:
            score += preferred_locations.get(event.location.lower(), 0) * 2

        score += min(booked_counts.get(event.id, 0), 25)

        if score > 0:
            scored_events.append((score, event.event_date or datetime.max, event))

    scored_events.sort(key=lambda item: (-item[0], item[1]))
    recommendations = [event for _, _, event in scored_events[:8]]

    if len(recommendations) < 4:
        existing_ids = {event.id for event in recommendations}
        for event in trending_events(db):
            if event.id not in existing_ids and event.id not in booked_event_ids:
                recommendations.append(event)
            if len(recommendations) >= 8:
                break

    return [event_with_rating(db, event) for event in recommendations]
