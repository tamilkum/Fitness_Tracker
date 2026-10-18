from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from app.repositories.activities import get_user_activities


def activity_summary(db: Session, user_id: str) -> dict:
    activities = get_user_activities(db, user_id, limit=5000)

    by_day: dict[date, dict] = defaultdict(
        lambda: {"points": 0, "activities": 0}
    )

    by_sport: dict[str, dict] = defaultdict(
        lambda: {
            "activities": 0,
            "points": 0,
            "distance_km": 0,
            "duration_minutes": 0,
            "steps": 0,
        }
    )

    for activity in activities:
        activity_date = activity.occurred_at.date()

        by_day[activity_date]["points"] += activity.points
        by_day[activity_date]["activities"] += 1

        sport_summary = by_sport[activity.sport]
        sport_summary["activities"] += 1
        sport_summary["points"] += activity.points
        sport_summary["distance_km"] += activity.distance_km or 0
        sport_summary["duration_minutes"] += (activity.duration_seconds or 0) // 60
        sport_summary["steps"] += activity.steps or 0

    return {
        "total_points": sum(activity.points for activity in activities),
        "activity_count": len(activities),
        "history": [
            {"date": day.isoformat(), **values}
            for day, values in sorted(by_day.items())
        ],
        "sport_breakdown": [
            {"sport": sport, **values}
            for sport, values in sorted(by_sport.items())
        ],
    }
