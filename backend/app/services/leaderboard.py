from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.activity import Activity
from app.models.user import User


def _period_bounds(
    start_date: date,
    end_date: date,
) -> tuple[datetime, datetime]:
    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end_exclusive = datetime.combine(
        end_date + timedelta(days=1),
        time.min,
        tzinfo=timezone.utc,
    )

    return start, end_exclusive


def _activity_filters(
    start: datetime | None,
    end_exclusive: datetime | None,
) -> list:
    filters = []

    if start is not None and end_exclusive is not None:
        filters.extend(
            [
                Activity.occurred_at >= start,
                Activity.occurred_at < end_exclusive,
            ]
        )

    return filters


def _aggregate_users(
    db: Session,
    start: datetime | None,
    end_exclusive: datetime | None,
) -> list[dict]:
    filters = _activity_filters(start, end_exclusive)

    point_rows = db.execute(
        select(
            Activity.user_id,
            func.coalesce(func.sum(Activity.points), 0),
        )
        .where(*filters)
        .group_by(Activity.user_id)
    ).all()

    points_by_user = {
        user_id: int(total_points)
        for user_id, total_points in point_rows
    }

    activity_rows = db.execute(
        select(Activity.user_id, Activity.occurred_at)
        .where(*filters)
    ).all()

    active_dates: dict[int, set[date]] = defaultdict(set)

    for user_id, occurred_at in activity_rows:
        active_dates[user_id].add(occurred_at.date())

    users = db.scalars(select(User)).all()

    results = []

    for user in users:
        results.append(
            {
                "user_id": user.id,
                "name": f"{user.first_name} {user.last_name}",
                "normalized_name": (
                    f"{user.normalized_first_name} "
                    f"{user.normalized_last_name}"
                ),
                "total_points": points_by_user.get(user.id, 0),
                "consistency_days": len(active_dates[user.id]),
            }
        )

    return results


def _sort_key(row: dict) -> tuple:
    return (
        -row["total_points"],
        -row["consistency_days"],
        row["normalized_name"],
        row["user_id"],   # UUID string — still gives stable sort
    )


def leaderboard(db: Session) -> list[dict]:
    start = None
    end_exclusive = None

    if settings.challenge_start and settings.challenge_end:
        start, end_exclusive = _period_bounds(
            settings.challenge_start,
            settings.challenge_end,
        )

    current = _aggregate_users(db, start, end_exclusive)
    current.sort(key=_sort_key)

    previous_ranks: dict[int, int] = {}

    if start is not None and end_exclusive is not None:
        period_length = end_exclusive - start
        previous_start = start - period_length

        previous = _aggregate_users(db, previous_start, start)
        previous.sort(key=_sort_key)
        previous_ranks = {
            row["user_id"]: rank
            for rank, row in enumerate(previous, start=1)
        }

    for rank, row in enumerate(current, start=1):
        row["rank"] = rank

        if start is None:
            row["rank_change"] = None
        else:
            old_rank = previous_ranks.get(row["user_id"])
            row["rank_change"] = (
                old_rank - rank
                if old_rank is not None
                else None
            )

        row.pop("normalized_name")

    return current
