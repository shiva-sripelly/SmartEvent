from fastapi import FastAPI
from app.database import Base, engine
from app.routes import auth, events, bookings, tickets, notifications, payments, admin, coupons, reviews
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # pyright: ignore[reportMissingImports]
from pathlib import Path
from app.utils.reminder import start_reminder_scheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartEvent API")
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)

app.mount("/qr_codes", StaticFiles(directory="qr_codes"), name="qr_codes")
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
start_reminder_scheduler()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
@app.get("/")
def home():
    return {"message": "SmartEvent API is running"}
