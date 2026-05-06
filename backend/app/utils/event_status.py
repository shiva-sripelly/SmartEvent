from datetime import datetime
from app.models import Event


ACTIVE_EVENT_STATUSES = ["ACTIVE", "UPCOMING", "ONGOING"]
BLOCKED_EVENT_STATUSES = ["CANCELLED", "COMPLETED"]


def is_event_expired(event: Event, now: datetime | None = None) -> bool:
    if not event or not event.event_date:
        return False

    current_time = now or datetime.now()
    return event.status == "COMPLETED" or event.event_date < current_time


def is_event_bookable(event: Event, now: datetime | None = None) -> bool:
    if not event:
        return False

    return event.status not in BLOCKED_EVENT_STATUSES and not is_event_expired(
        event,
        now,
    )


def expire_past_events(db):
    now = datetime.now()

    expired_events = (
        db.query(Event)
        .filter(Event.event_date < now)
        .filter(Event.status.in_(ACTIVE_EVENT_STATUSES))
        .all()
    )

    for event in expired_events:
        event.status = "COMPLETED"

    db.commit()
