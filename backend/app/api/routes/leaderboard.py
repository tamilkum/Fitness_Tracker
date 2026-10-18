from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.leaderboard import LeaderboardEntry
from app.services.leaderboard import leaderboard


router = APIRouter(
    prefix="/leaderboard",
    tags=["leaderboard"],
)


@router.get(
    "/",
    response_model=list[LeaderboardEntry],
)
def read_leaderboard(
    db: Session = Depends(get_db),
):
    return leaderboard(db)
