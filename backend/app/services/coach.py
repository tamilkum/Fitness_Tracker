from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import Activity


def coach_message(db: Session, user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    recent_activities = db.scalars(
        select(Activity)
        .where(
            Activity.user_id == user_id,
            Activity.occurred_at >= seven_days_ago,
        )
        .order_by(Activity.occurred_at.desc())
    ).all()

    active_days = {activity.occurred_at.date() for activity in recent_activities}
    active_day_count = len(active_days)

    if not recent_activities:
        message = (
            "Ready to start? A comfortable walk can be a simple way "
            "to begin. Choose an activity that feels right for you."
        )
    elif active_day_count >= 5:
        message = (
            f"You logged activity on {active_day_count} days this week. "
            "Nice consistency. Consider an easy or recovery day if you feel you need one."
        )
    else:
        message = (
            f"You logged activity on {active_day_count} day(s) this week. "
            "A small, comfortable activity can help you keep building your routine."
        )

    return {
        "active_days_last_7": active_day_count,
        "message": message,
        "disclaimer": (
            "General encouragement only; this is not medical advice or a health assessment."
        ),
    }
