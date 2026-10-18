from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.activity import Activity
from app.repositories.activities import (
    create_activity,
    get_user_activities,
)
from app.repositories.users import get_user
from app.schemas.activity import ActivityCreate, ActivityRead
from app.services.achievements import evaluate_and_award
from app.services.scoring import calculate_points


router = APIRouter(
    prefix="/activities",
    tags=["activities"],
)


@router.post(
    "/",
    response_model=ActivityRead,
    status_code=status.HTTP_201_CREATED,
)
def ingest_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
):
    if get_user(db, payload.user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    occurred_at = payload.occurred_at or datetime.now(timezone.utc)

    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)

    points = calculate_points(
        payload.sport,
        distance_km=payload.distance_km,
        duration_seconds=payload.duration_seconds,
        steps=payload.steps,
    )

    activity = Activity(
        user_id=payload.user_id,
        sport=payload.sport,
        distance_km=payload.distance_km,
        duration_seconds=payload.duration_seconds,
        steps=payload.steps,
        points=points,
        occurred_at=occurred_at,
    )

    saved = create_activity(db, activity)
    evaluate_and_award(db, payload.user_id, payload.sport)

    return saved


@router.get(
    "/",
    response_model=list[ActivityRead],
)
def read_activities(
    user_id: str = Query(min_length=36, max_length=36),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    if get_user(db, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return get_user_activities(
        db,
        user_id=user_id,
        limit=limit,
    )
