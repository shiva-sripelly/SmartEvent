from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models import Coupon, User
from app.schemas import (
    CouponCreate,
    CouponResponse,
    CouponValidateRequest,
    CouponValidationResponse,
)

router = APIRouter(prefix="/coupons", tags=["Coupons"])


def calculate_coupon_discount(coupon: Coupon, booking_amount: float) -> float:
    if coupon.discount_type == "PERCENTAGE":
        return min(booking_amount, booking_amount * (coupon.discount_value / 100))
    if coupon.discount_type == "FIXED":
        return min(booking_amount, coupon.discount_value)
    raise HTTPException(status_code=400, detail="Invalid coupon discount type")


def validate_coupon_for_amount(
    db: Session,
    coupon_code: str,
    booking_amount: float,
) -> tuple[Coupon, float, float]:
    coupon = db.query(Coupon).filter(
        Coupon.coupon_code == coupon_code.strip().upper()
    ).first()

    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is not active")

    if coupon.expiry_date < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    if booking_amount < coupon.minimum_booking_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum booking amount is {coupon.minimum_booking_amount}",
        )

    discount_amount = calculate_coupon_discount(coupon, booking_amount)
    final_amount = max(0, booking_amount - discount_amount)
    return coupon, discount_amount, final_amount


@router.post("/", response_model=CouponResponse)
def create_coupon(
    coupon: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "ORGANIZER")),
):
    existing = db.query(Coupon).filter(
        Coupon.coupon_code == coupon.coupon_code.strip().upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    new_coupon = Coupon(
        **coupon.dict(exclude={"coupon_code", "discount_type"}),
        coupon_code=coupon.coupon_code.strip().upper(),
        discount_type=coupon.discount_type.strip().upper(),
    )
    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)
    return new_coupon


@router.get("/", response_model=List[CouponResponse])
def list_coupons(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "ORGANIZER")),
):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("/validate", response_model=CouponValidationResponse)
def validate_coupon(
    request: CouponValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coupon, discount_amount, final_amount = validate_coupon_for_amount(
        db,
        request.coupon_code,
        request.booking_amount,
    )

    return {
        "coupon_id": coupon.id,
        "coupon_code": coupon.coupon_code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "message": "Coupon applied successfully",
    }
