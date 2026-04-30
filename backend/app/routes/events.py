from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Event, User
from app.schemas import EventCreate, EventResponse
from app.core.security import require_roles
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/events", tags=["Events"])


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
    return db.query(Event).all()

@router.get("/search/", response_model=List[EventResponse])
def search_events(title: str, db: Session = Depends(get_db)):
    expire_past_events(db)
    return db.query(Event).filter(Event.title.ilike(f"%{title}%")).all()


@router.get("/category/{category_name}", response_model=List[EventResponse])
def filter_by_category(category_name: str, db: Session = Depends(get_db)):
    expire_past_events(db)
    return db.query(Event).filter(Event.category.ilike(category_name)).all()

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    expire_past_events(db)
    return db.query(Event).filter(Event.id == event_id).first()