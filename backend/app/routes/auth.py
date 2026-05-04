from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.utils.email import send_email
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv("backend.env")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        role="USER"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    send_email(
        to_email=new_user.email,
        subject="Welcome to SmartEvent",
        message=f"""
Hello {new_user.username},

Welcome to SmartEvent!

Your account has been created successfully.

You can now:
- Explore events
- Book tickets
- View QR tickets
- Receive event reminders

Regards,
SmartEvent Team
"""
    )

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()


    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": db_user.email,
        "role": db_user.role,
        "user_id": db_user.id
    })

    send_email(
        to_email=db_user.email,
        subject="SmartEvent Login Alert",
        message=f"""
Hello {db_user.username},

You successfully logged in to your SmartEvent account.

If this was not you, please secure your account immediately.

Regards,
SmartEvent Team
"""
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    if payload.email != payload.confirm_email:
        raise HTTPException(status_code=400, detail="Emails do not match")

    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reset_token = jwt.encode(
        {
            "sub": user.email,
            "exp": datetime.utcnow() + timedelta(minutes=15)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    send_email(
        to_email=user.email,
        subject="SmartEvent Password Reset Link",
        message=f"""
Hello {user.username},

We received a request to reset your SmartEvent password.

Click the link below to reset your password:

{reset_link}

This link is valid for 15 minutes.

If you did not request this, please ignore this email.

Regards,
SmartEvent Team
"""
    )

    return {"message": "Password reset link sent successfully"}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    try:
        data = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = data.get("sub")

        if not email:
            raise HTTPException(status_code=400, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password reset successfully"}