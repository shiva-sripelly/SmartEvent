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
    return db.query(Ticket).join(Ticket.booking).filter(
        Ticket.booking.has(user_id=current_user.id)
    ).all()