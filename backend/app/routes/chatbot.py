from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models import Booking, Event, Review, User
from app.routes.recommendations import trending_events
from app.schemas import ChatbotRequest, ChatbotResponse, EventResponse
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/chatbot", tags=["AI Chatbot"])


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


def extract_after_keywords(message: str, keywords: list[str]) -> Optional[str]:
    lowered = message.lower()
    for keyword in keywords:
        marker = f"{keyword} "
        if marker in lowered:
            value = lowered.split(marker, 1)[1].strip(" .?!")
            for stop_word in [" this weekend", " weekend", " today", " tomorrow"]:
                value = value.replace(stop_word, "")
            return value.strip() or None
    return None


def weekend_range() -> tuple[datetime, datetime]:
    today = datetime.utcnow()
    days_until_saturday = (5 - today.weekday()) % 7
    saturday = today + timedelta(days=days_until_saturday)
    start = datetime(saturday.year, saturday.month, saturday.day)
    end = start + timedelta(days=2, hours=23, minutes=59, seconds=59)
    return start, end


def serialize_booking(booking: Booking) -> dict:
    event = booking.event
    return {
        "id": booking.id,
        "event_id": booking.event_id,
        "event_title": event.title if event else "Event",
        "event_location": event.location if event else None,
        "event_date": event.event_date if event else None,
        "ticket_quantity": booking.ticket_quantity,
        "booking_status": booking.booking_status,
        "final_amount": booking.final_amount if booking.final_amount is not None else booking.total_price,
    }


def search_events_for_message(db: Session, message: str) -> list[Event]:
    lowered = message.lower()
    query = active_events_query(db)

    category_terms = ["music", "tech", "sports", "business", "comedy", "workshop"]
    matched_category = next((term for term in category_terms if term in lowered), None)
    location = extract_after_keywords(lowered, ["near", "in", "at"])

    if matched_category:
        query = query.filter(Event.category.ilike(f"%{matched_category}%"))

    if location and location not in ["me", "my"]:
        query = query.filter(Event.location.ilike(f"%{location}%"))

    if "weekend" in lowered:
        start, end = weekend_range()
        query = query.filter(Event.event_date >= start, Event.event_date <= end)

    if "today" in lowered:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        query = query.filter(Event.event_date >= start, Event.event_date < end)

    if "tomorrow" in lowered:
        start = (datetime.utcnow() + timedelta(days=1)).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        end = start + timedelta(days=1)
        query = query.filter(Event.event_date >= start, Event.event_date < end)

    return [event_with_rating(db, event) for event in query.order_by(Event.event_date.asc()).limit(6).all()]


@router.post("/chat", response_model=ChatbotResponse)
def chat_with_assistant(
    payload: ChatbotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expire_past_events(db)
    message = payload.message.strip()
    lowered = message.lower()

    default_suggestions = [
        "Trending events",
        "My bookings",
        "Suggest music events this weekend",
        "Help with ticket issues",
    ]

    if any(term in lowered for term in ["booking", "bookings", "my tickets", "show my"]):
        bookings = (
            db.query(Booking)
            .filter(Booking.user_id == current_user.id)
            .order_by(Booking.created_at.desc(), Booking.id.desc())
            .limit(5)
            .all()
        )
        if not bookings:
            return ChatbotResponse(
                reply="I could not find any bookings on your account yet. You can explore events and book tickets from the homepage.",
                suggestions=["Trending events", "Find events near me"],
                action_path="/",
            )

        return ChatbotResponse(
            reply=f"I found your latest {len(bookings)} booking(s). Open Bookings for full details, or Tickets for QR codes.",
            bookings=[serialize_booking(booking) for booking in bookings],
            suggestions=["Open my tickets", "Help with ticket issues", "Trending events"],
            action_path="/bookings",
        )

    if any(term in lowered for term in ["ticket issue", "ticket issues", "qr", "refund", "cancel", "payment issue"]):
        return ChatbotResponse(
            reply=(
                "For ticket issues, first open Tickets and check the QR code. "
                "If payment succeeded but a ticket is missing, check Bookings and Notifications. "
                "For cancelled or expired events, the event page will show the current status."
            ),
            suggestions=["Open my tickets", "Show my bookings", "Payment help"],
            action_path="/tickets",
        )

    if any(term in lowered for term in ["trend", "popular", "hot"]):
        events = trending_events(db, limit=6)
        return ChatbotResponse(
            reply="These events are trending based on recent booking activity.",
            events=events,
            suggestions=["Suggest music events this weekend", "Find events near me", "My bookings"],
        )

    if any(term in lowered for term in ["near me", "near", "suggest", "find", "event", "events", "music", "weekend"]):
        events = search_events_for_message(db, lowered)
        if not events and "near me" in lowered:
            events = trending_events(db, limit=6)

        if not events:
            return ChatbotResponse(
                reply="I could not find matching upcoming events right now. Try a broader category or check trending events.",
                suggestions=["Trending events", "Music events", "Tech events"],
            )

        return ChatbotResponse(
            reply=f"I found {len(events)} event(s) that match your request.",
            events=events,
            suggestions=["Trending events", "My bookings", "Help with ticket issues"],
        )

    if any(term in lowered for term in ["where", "navigate", "how do i", "help"]):
        return ChatbotResponse(
            reply=(
                "I can help you find events, view bookings, open QR tickets, manage your wishlist, "
                "and understand payment or ticket issues. Use the quick buttons below or ask in your own words."
            ),
            suggestions=default_suggestions,
        )

    return ChatbotResponse(
        reply="I can help with event discovery, trending events, bookings, tickets, payments, and navigation. What would you like to do?",
        suggestions=default_suggestions,
    )
