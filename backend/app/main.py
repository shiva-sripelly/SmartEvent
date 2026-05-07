from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.utils.connection_manager import manager
from app.database import Base, engine, SessionLocal
from app.routes import auth, events, bookings, tickets, notifications, payments, admin, coupons, reviews, wishlist, event_updates, recommendations, chatbot
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # pyright: ignore[reportMissingImports]
from pathlib import Path
from sqlalchemy import inspect, text
from app.utils.reminder import start_reminder_scheduler
from app.models import Event, User
from uuid import uuid4

Base.metadata.create_all(bind=engine)


def ensure_profile_columns():
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}

    with engine.begin() as connection:
        if "profile_picture" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)")
            )
        if "referral_code" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN referral_code VARCHAR(20)")
            )
        if "referred_by_id" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN referred_by_id INTEGER")
            )


def ensure_referral_codes():
    db = SessionLocal()
    try:
        users_without_codes = db.query(User).filter(User.referral_code.is_(None)).all()

        for user in users_without_codes:
            while True:
                code = f"SE{uuid4().hex[:8].upper()}"
                exists = db.query(User).filter(User.referral_code == code).first()
                if not exists:
                    user.referral_code = code
                    break

        db.commit()
    finally:
        db.close()


ensure_profile_columns()
ensure_referral_codes()

app = FastAPI(title="SmartEvent API")

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)

app.mount("/qr_codes", StaticFiles(directory="qr_codes"), name="qr_codes")
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

start_reminder_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(tickets.router)
app.include_router(notifications.router)
app.include_router(payments.router)
app.include_router(coupons.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(wishlist.router)
app.include_router(event_updates.router)
app.include_router(recommendations.router)
app.include_router(chatbot.router)


@app.get("/")
def home():
    return {"message": "SmartEvent API is running"}


@app.websocket("/ws/events/{event_id}/availability")
async def websocket_event_availability(websocket: WebSocket, event_id: int):
    await manager.connect(event_id, websocket)

    db = SessionLocal()
    try:
        event = db.query(Event).filter(Event.id == event_id).first()

        if event:
            await websocket.send_json(
                {
                    "type": "availability_update",
                    "event_id": event.id,
                    "available_tickets": event.available_tickets,
                    "status": event.status,
                }
            )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(event_id, websocket)

    finally:
        db.close()


@app.get("/ws/events/{event_id}/availability")
def get_event_availability(event_id: int):
    db = SessionLocal()
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            return {
                "type": "availability_update",
                "event_id": event_id,
                "available_tickets": 0,
                "status": "COMPLETED",
            }

        return {
            "type": "availability_update",
            "event_id": event.id,
            "available_tickets": event.available_tickets,
            "status": event.status,
        }
    finally:
        db.close()
