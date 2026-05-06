from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.database import get_db
from app.models import Event, User, Wishlist
from app.schemas import WishlistResponse
from app.utils.event_status import expire_past_events

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("/", response_model=List[WishlistResponse])
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expire_past_events(db)
    return (
        db.query(Wishlist)
        .options(joinedload(Wishlist.event))
        .filter(Wishlist.user_id == current_user.id)
        .order_by(Wishlist.created_at.desc(), Wishlist.id.desc())
        .all()
    )


@router.post("/{event_id}", response_model=WishlistResponse)
def add_to_wishlist(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expire_past_events(db)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    wishlist_item = (
        db.query(Wishlist)
        .options(joinedload(Wishlist.event))
        .filter(
            Wishlist.user_id == current_user.id,
            Wishlist.event_id == event_id,
        )
        .first()
    )
    if wishlist_item:
        return wishlist_item

    wishlist_item = Wishlist(user_id=current_user.id, event_id=event_id)
    db.add(wishlist_item)
    db.commit()

    return (
        db.query(Wishlist)
        .options(joinedload(Wishlist.event))
        .filter(Wishlist.id == wishlist_item.id)
        .first()
    )


@router.delete("/{event_id}")
def remove_from_wishlist(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wishlist_item = (
        db.query(Wishlist)
        .filter(
            Wishlist.user_id == current_user.id,
            Wishlist.event_id == event_id,
        )
        .first()
    )

    if not wishlist_item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")

    db.delete(wishlist_item)
    db.commit()
    return {"message": "Event removed from wishlist"}
