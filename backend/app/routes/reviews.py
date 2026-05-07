from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models import Booking, Event, Review, User
from app.schemas import ReviewCreate, ReviewResponse, ReviewUpdate
from app.utils.rewards import REVIEW_REWARD_POINTS, award_reward

router = APIRouter(prefix="/reviews", tags=["Reviews"])


def serialize_review(review: Review) -> dict:
    return {
        "id": review.id,
        "user_id": review.user_id,
        "event_id": review.event_id,
        "rating": review.rating,
        "review_text": review.review_text,
        "created_at": review.created_at,
        "username": review.user.username if review.user else None,
    }


def ensure_attended_event(db: Session, user_id: int, event_id: int) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    attended = db.query(Booking).filter(
        Booking.user_id == user_id,
        Booking.event_id == event_id,
        Booking.booking_status == "CONFIRMED",
    ).first()

    if not attended:
        raise HTTPException(
            status_code=403,
            detail="Only users with a confirmed booking can review this event",
        )


@router.post("/", response_model=ReviewResponse)
def submit_review(
    review: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_attended_event(db, current_user.id, review.event_id)

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.event_id == review.event_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this event")

    new_review = Review(
        user_id=current_user.id,
        event_id=review.event_id,
        rating=review.rating,
        review_text=review.review_text,
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    award_reward(
        db,
        user_id=current_user.id,
        source_type="REVIEW",
        source_id=new_review.id,
        points=REVIEW_REWARD_POINTS,
        description="Reward for event review",
        review_id=new_review.id,
    )
    db.commit()
    return serialize_review(new_review)


@router.get("/event/{event_id}", response_model=List[ReviewResponse])
def get_event_reviews(event_id: int, db: Session = Depends(get_db)):
    return [
        serialize_review(review)
        for review in db.query(Review)
        .filter(Review.event_id == event_id)
        .order_by(Review.created_at.desc())
        .all()
    ]


@router.get("/event/{event_id}/summary")
def get_event_review_summary(event_id: int, db: Session = Depends(get_db)):
    average_rating = db.query(func.avg(Review.rating)).filter(
        Review.event_id == event_id
    ).scalar()
    reviews_count = db.query(Review).filter(Review.event_id == event_id).count()

    return {
        "event_id": event_id,
        "average_rating": round(float(average_rating), 2) if average_rating else 0,
        "reviews_count": reviews_count,
    }


@router.put("/{review_id}", response_model=ReviewResponse)
def update_review(
    review_id: int,
    payload: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own reviews")

    review.rating = payload.rating
    review.review_text = payload.review_text
    db.commit()
    db.refresh(review)
    return serialize_review(review)


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own reviews")

    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}
