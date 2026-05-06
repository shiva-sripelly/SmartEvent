from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.database import get_db
from app.models import Event, EventUpdate, User
from app.schemas import EventUpdateCreate, EventUpdateResponse
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/event-updates", tags=["Event Updates"])


@router.get("/event/{event_id}", response_model=List[EventUpdateResponse])
def get_event_updates(event_id: int, db: Session = Depends(get_db)):
    expire_past_events(db)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return (
        db.query(EventUpdate)
        .filter(EventUpdate.event_id == event_id)
        .order_by(EventUpdate.created_at.desc(), EventUpdate.id.desc())
        .all()
    )


@router.post("/event/{event_id}", response_model=EventUpdateResponse)
def post_event_update(
    event_id: int,
    update: EventUpdateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ORGANIZER", "ADMIN")),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.role == "ORGANIZER" and event.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to post updates for this event",
        )

    event_update = EventUpdate(
        event_id=event.id,
        message=update.message.strip(),
        is_important=1 if update.is_important else 0,
    )
    db.add(event_update)
    db.commit()
    db.refresh(event_update)
    return event_update
