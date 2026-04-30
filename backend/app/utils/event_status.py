from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Event


def expire_past_events(db: Session) -> None:
    now = datetime.now()
    events = db.query(Event).all()

    if not events:
        return

    for event in events:
        if event.status == "CANCELLED":
            continue

        if event.event_date is None:
            continue

        event_end = event.event_date + timedelta(hours=4)

        if now < event.event_date:
            event.status = "UPCOMING"
        elif event.event_date <= now < event_end:
            event.status = "ONGOING"
        else:
            event.status = "COMPLETED"

    db.commit()
