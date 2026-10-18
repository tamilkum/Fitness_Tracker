from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.users import get_user
from app.schemas.achievement import AchievementRead
from app.services.achievements import get_earned_achievements


router = APIRouter(
    prefix="/users/{user_id}/achievements",
    tags=["achievements"],
)


@router.get("/", response_model=list[AchievementRead])
def read_achievements(user_id: str, db: Session = Depends(get_db)):
    if get_user(db, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return get_earned_achievements(db, user_id)
