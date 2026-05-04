from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship, synonym
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="USER")
    created_at = Column(DateTime, default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500))
    category = Column(String(50))
    location = Column(String(100))
    event_date = Column(DateTime)
    ticket_price = Column(Float)
    banner_image = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    available_tickets = Column(Integer, default=100)
    status = Column(String(20), default="UPCOMING")
    event_status = synonym("status")
    created_by = Column(Integer, ForeignKey("users.id"))
    organizer_id = synonym("created_by")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_id = Column(Integer, ForeignKey("events.id"))
    ticket_quantity = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    discount_amount = Column(Float, default=0)
    final_amount = Column(Float, nullable=True)
    booking_status = Column(String(50), default="CONFIRMED")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    event = relationship("Event")
    coupon = relationship("Coupon")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    ticket_code = Column(String(100), unique=True)
    qr_code_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200))
    message = Column(String(500))
    type = Column(String(50))  
    notification_type = synonym("type")
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    payment_method = Column(String(50), nullable=False)
    payment_status = Column(String(20), default="PENDING")
    transaction_id = Column(String(150), unique=True, index=True)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    coupon_code = Column(String(50), unique=True, index=True, nullable=False)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Float, nullable=False)
    minimum_booking_amount = Column(Float, default=0)
    expiry_date = Column(DateTime, nullable=False)
    usage_limit = Column(Integer, nullable=False)
    used_count = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_id = Column(Integer, ForeignKey("events.id"))
    rating = Column(Integer, nullable=False)
    review_text = Column(String(1000))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    event = relationship("Event")
