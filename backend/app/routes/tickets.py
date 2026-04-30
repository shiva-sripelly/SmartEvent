from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Ticket, User
from app.schemas import TicketResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("/", response_model=List[TicketResponse])
def get_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tickets = db.query(Ticket).join(Ticket.booking).filter(
        Ticket.booking.has(user_id=current_user.id)
    ).all()

    return [
        {
            "id": ticket.id,
            "booking_id": ticket.booking_id,
            "ticket_code": ticket.ticket_code,
            "qr_code_url": ticket.qr_code_url,
            "event_title": ticket.booking.event.title,
            "event_location": ticket.booking.event.location,
            "event_date": ticket.booking.event.event_date,
            "ticket_quantity": ticket.booking.ticket_quantity,
            "total_price": ticket.booking.total_price,
            "booking_status": ticket.booking.booking_status,
        }
        for ticket in tickets
    ]