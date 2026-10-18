from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Activity(Base):
    __tablename__ = "activities"

    __table_args__ = (
        CheckConstraint(
            "(sport IN ('running', 'walking', 'cycling') "
            "AND distance_km IS NOT NULL "
            "AND duration_seconds IS NULL "
            "AND steps IS NULL) "
            "OR (sport IN ('gym', 'swimming') "
            "AND distance_km IS NULL "
            "AND duration_seconds IS NOT NULL "
            "AND steps IS NULL) "
            "OR (sport = 'daily_steps' "
            "AND distance_km IS NULL "
            "AND duration_seconds IS NULL "
            "AND steps IS NOT NULL)",
            name="ck_activities_sport_metric_pairing",
        ),
        CheckConstraint(
            "(distance_km IS NULL OR distance_km > 0) "
            "AND (duration_seconds IS NULL "
            "OR duration_seconds BETWEEN 1 AND 86400) "
            "AND (steps IS NULL OR steps BETWEEN 1 AND 2000000)",
            name="ck_activities_metric_ranges",
        ),
        CheckConstraint(
            "points >= 0",
            name="ck_activities_points_nonnegative",
        ),
        Index(
            "ix_activities_user_occurred_at",
            "user_id",
            "occurred_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # FK references users.id which is now a UUID TEXT
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    sport: Mapped[str] = mapped_column(String(20), index=True, nullable=False)

    distance_km: Mapped[float | None] = mapped_column(
        Numeric(10, 3),
        nullable=True,
    )
    duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    steps: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    points: Mapped[int] = mapped_column(Integer, nullable=False)

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="activities")
