from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity


def create_activity(db: Session, activity: Activity) -> Activity:
    db.add(activity)
    db.commit()
    db.refresh(activity)

    return activity


def get_user_activities(
    db: Session,
    user_id: str,
    limit: int = 100,
) -> list[Activity]:
    statement = (
        select(Activity)
        .where(Activity.user_id == user_id)
        .order_by(Activity.occurred_at.desc())
        .limit(limit)
    )

    return list(db.scalars(statement).all())
