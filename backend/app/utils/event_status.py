from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Event


def expire_past_events(db: Session) -> None:
    now = datetime.now()
    expired_events = (
        db.query(Event)
        .filter(Event.status == "ACTIVE", Event.event_date < now)
        .all()
    )

    if not expired_events:
        return

    for event in expired_events:
        event.status = "EXPIRED"

    db.commit()
