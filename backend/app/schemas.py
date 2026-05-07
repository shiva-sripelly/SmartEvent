from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any, Optional, Annotated

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: Annotated[str, Field(min_length=6, max_length=72)]
    referral_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    profile_picture: Optional[str] = None
    referral_code: Optional[str] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    
class EventCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    event_date: datetime
    ticket_price: float
    banner_image: str

class EventResponse(EventCreate):
    id: int
    created_by: Optional[int] = None
    organizer_id: Optional[int] = None
    available_tickets: Optional[int] = None
    status: Optional[str] = None
    event_status: Optional[str] = None
    created_at: Optional[datetime] = None
    average_rating: Optional[float] = None
    reviews_count: Optional[int] = None

    class Config:
        from_attributes = True


class WishlistResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    created_at: datetime
    event: EventResponse

    class Config:
        from_attributes = True


class EventUpdateCreate(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    is_important: int = 0


class EventUpdateResponse(BaseModel):
    id: int
    event_id: int
    message: str
    is_important: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
        
class BookingCreate(BaseModel):
    event_id: int
    ticket_quantity: int = Field(gt=0)
    coupon_code: Optional[str] = None


class BookingResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    ticket_quantity: int
    total_price: float
    coupon_id: Optional[int] = None
    discount_amount: float = 0
    final_amount: Optional[float] = None
    booking_status: str
    event_status: Optional[str] = None
    event_date: Optional[datetime] = None

    class Config:
        from_attributes = True
        
class TicketResponse(BaseModel):
    id: int
    booking_id: int
    ticket_code: str
    qr_code_url: str
    event_title: str
    event_location: Optional[str] = None
    event_date: datetime
    ticket_quantity: int
    total_price: float
    booking_status: str
    event_status: Optional[str] = None
    is_expired: bool = False

    class Config:
        from_attributes = True
        
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    notification_type: Optional[str] = None
    is_read: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    confirm_email: EmailStr
    
    
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    payment_method: str
    payment_status: str
    transaction_id: Optional[str] = None
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentSimulationRequest(BaseModel):
    booking_id: int
    payment_method: str = "SIMULATED_CARD"
    succeed: bool = True


class CouponCreate(BaseModel):
    coupon_code: str
    discount_type: str
    discount_value: float = Field(gt=0)
    minimum_booking_amount: float = Field(default=0, ge=0)
    expiry_date: datetime
    usage_limit: int = Field(gt=0)
    is_active: int = 1


class CouponResponse(CouponCreate):
    id: int
    used_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CouponValidateRequest(BaseModel):
    coupon_code: str
    booking_amount: float = Field(ge=0)


class CouponValidationResponse(BaseModel):
    coupon_id: int
    coupon_code: str
    discount_type: str
    discount_value: float
    discount_amount: float
    final_amount: float
    message: str


class ReviewCreate(BaseModel):
    event_id: int
    rating: int = Field(ge=1, le=5)
    review_text: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)
    review_text: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    rating: int
    review_text: Optional[str] = None
    created_at: datetime
    username: Optional[str] = None

    class Config:
        from_attributes = True


class ChatbotMessage(BaseModel):
    role: str
    content: str


class ChatbotRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatbotMessage] = Field(default_factory=list)


class ChatbotResponse(BaseModel):
    reply: str
    suggestions: list[str] = Field(default_factory=list)
    events: list[EventResponse] = Field(default_factory=list)
    bookings: list[dict[str, Any]] = Field(default_factory=list)
    action_path: Optional[str] = None
