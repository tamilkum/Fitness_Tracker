from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.users import get_user
from app.schemas.dashboard import CoachRead, DashboardRead
from app.services.coach import coach_message
from app.services.dashboard import activity_summary


router = APIRouter(
    prefix="/users/{user_id}",
    tags=["dashboard"],
)


def ensure_user_exists(user_id: str, db: Session) -> None:
    if get_user(db, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )


@router.get("/dashboard", response_model=DashboardRead)
def read_dashboard(user_id: str, db: Session = Depends(get_db)):
    ensure_user_exists(user_id, db)
    return activity_summary(db, user_id)


@router.get("/coach", response_model=CoachRead)
def read_coach_card(user_id: str, db: Session = Depends(get_db)):
    ensure_user_exists(user_id, db)
    return coach_message(db, user_id)
