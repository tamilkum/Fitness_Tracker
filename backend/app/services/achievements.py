"""Achievement award logic (UUID user IDs)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.achievement import Achievement
from app.models.activity import Activity
from app.services.milestones import (
    MILESTONE_CONFIG,
    milestones_up_to,
    slug_for,
)


def _cumulative_distance_km(db: Session, user_id: str, sport: str) -> float:
    row = db.execute(
        select(func.coalesce(func.sum(Activity.distance_km), 0)).where(
            Activity.user_id == user_id,
            Activity.sport == sport,
        )
    ).scalar()
    return float(row or 0)


def _cumulative_duration_minutes(db: Session, user_id: str, sport: str) -> float:
    row = db.execute(
        select(func.coalesce(func.sum(Activity.duration_seconds), 0)).where(
            Activity.user_id == user_id,
            Activity.sport == sport,
        )
    ).scalar()
    return float(row or 0) / 60.0


def _cumulative_steps(db: Session, user_id: str) -> float:
    row = db.execute(
        select(func.coalesce(func.sum(Activity.steps), 0)).where(
            Activity.user_id == user_id,
            Activity.sport == "daily_steps",
        )
    ).scalar()
    return float(row or 0)


def _cumulative_for_sport(db: Session, user_id: str, sport: str) -> float:
    if sport in ("running", "walking", "cycling"):
        return _cumulative_distance_km(db, user_id, sport)
    if sport in ("swimming", "gym"):
        return _cumulative_duration_minutes(db, user_id, sport)
    if sport == "daily_steps":
        return _cumulative_steps(db, user_id)
    return 0.0


def get_earned_achievements(db: Session, user_id: str) -> list[Achievement]:
    return list(
        db.scalars(
            select(Achievement)
            .where(Achievement.user_id == user_id)
            .order_by(Achievement.unlocked_at)
        ).all()
    )


def evaluate_and_award(
    db: Session,
    user_id: str,
    sport: str,
) -> list[Achievement]:
    config = MILESTONE_CONFIG.get(sport)
    if config is None:
        return []

    cumulative = _cumulative_for_sport(db, user_id, sport)
    reached = milestones_up_to(config, cumulative)
    if not reached:
        return []

    existing_slugs: set[str] = {
        row.slug
        for row in db.scalars(
            select(Achievement).where(Achievement.user_id == user_id)
        ).all()
    }

    newly_awarded: list[Achievement] = []

    for threshold in reached:
        slug = slug_for(sport, threshold, config.unit)
        if slug in existing_slugs:
            continue

        achievement = Achievement(user_id=user_id, slug=slug)

        try:
            db.add(achievement)
            db.flush()
            existing_slugs.add(slug)
            newly_awarded.append(achievement)
        except Exception:
            db.rollback()

    if newly_awarded:
        db.commit()
        for a in newly_awarded:
            db.refresh(a)

    return newly_awarded
