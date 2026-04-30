from pydantic import BaseModel, EmailStr, constr
from datetime import datetime
from typing import Optional

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: constr(min_length=6, max_length=72)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str

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
    status: Optional[str] = None
    event_status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
class BookingCreate(BaseModel):
    event_id: int
    ticket_quantity: int


class BookingResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    ticket_quantity: int
    total_price: float
    booking_status: str

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

    class Config:
        from_attributes = True
        
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: int

    class Config:
        from_attributes = True
        
class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    confirm_email: EmailStr
    
    
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str