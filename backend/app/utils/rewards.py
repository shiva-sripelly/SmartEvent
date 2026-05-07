from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Booking, Referral, Review, Reward, User

BOOKING_REWARD_POINTS = 10
REVIEW_REWARD_POINTS = 5
REFERRAL_REWARD_POINTS = 20


def award_reward(
    db: Session,
    *,
    user_id: int,
    source_type: str,
    source_id: int,
    points: int,
    description: str,
    booking_id: int | None = None,
    review_id: int | None = None,
    referral_id: int | None = None,
) -> Reward:
    existing = (
        db.query(Reward)
        .filter(
            Reward.user_id == user_id,
            Reward.source_type == source_type,
            Reward.source_id == source_id,
        )
        .first()
    )
    if existing:
        return existing

    reward = Reward(
        user_id=user_id,
        source_type=source_type,
        source_id=source_id,
        points=points,
        description=description,
        booking_id=booking_id,
        review_id=review_id,
        referral_id=referral_id,
    )
    db.add(reward)
    db.flush()
    return reward


def ensure_referral_record(
    db: Session,
    *,
    referrer: User,
    referred_user: User,
    referral_code: str,
) -> Referral:
    existing = (
        db.query(Referral)
        .filter(Referral.referred_user_id == referred_user.id)
        .first()
    )
    if existing:
        return existing

    referral = Referral(
        referrer_id=referrer.id,
        referred_user_id=referred_user.id,
        referral_code=referral_code,
        status="SUCCESS",
    )
    db.add(referral)
    db.flush()

    award_reward(
        db,
        user_id=referrer.id,
        source_type="REFERRAL",
        source_id=referral.id,
        points=REFERRAL_REWARD_POINTS,
        description=f"Referral reward for inviting {referred_user.username}",
        referral_id=referral.id,
    )
    return referral


def sync_user_reward_history(db: Session, user_id: int) -> None:
    confirmed_bookings = (
        db.query(Booking)
        .filter(
            Booking.user_id == user_id,
            Booking.booking_status == "CONFIRMED",
        )
        .all()
    )
    for booking in confirmed_bookings:
        award_reward(
            db,
            user_id=user_id,
            source_type="BOOKING",
            source_id=booking.id,
            points=BOOKING_REWARD_POINTS,
            description="Reward for confirmed booking",
            booking_id=booking.id,
        )

    reviews = db.query(Review).filter(Review.user_id == user_id).all()
    for review in reviews:
        award_reward(
            db,
            user_id=user_id,
            source_type="REVIEW",
            source_id=review.id,
            points=REVIEW_REWARD_POINTS,
            description="Reward for event review",
            review_id=review.id,
        )

    legacy_referrals = (
        db.query(User)
        .filter(User.referred_by_id == user_id)
        .all()
    )
    referrer = db.query(User).filter(User.id == user_id).first()
    if referrer:
        for referred_user in legacy_referrals:
            ensure_referral_record(
                db,
                referrer=referrer,
                referred_user=referred_user,
                referral_code=referrer.referral_code or "",
            )


def get_reward_points(db: Session, user_id: int, source_type: str | None = None) -> int:
    query = db.query(func.coalesce(func.sum(Reward.points), 0)).filter(
        Reward.user_id == user_id
    )
    if source_type:
        query = query.filter(Reward.source_type == source_type)
    return int(query.scalar() or 0)


def get_referral_count(db: Session, user_id: int) -> int:
    return (
        db.query(Referral)
        .filter(
            Referral.referrer_id == user_id,
            Referral.status == "SUCCESS",
        )
        .count()
    )
