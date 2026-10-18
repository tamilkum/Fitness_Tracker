from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Achievement(Base):
    """One row per badge a user has earned."""

    __tablename__ = "achievements"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "slug",
            name="uq_achievement_user_slug",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # FK references users.id which is now a UUID TEXT
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    slug: Mapped[str] = mapped_column(String(64), nullable=False)

    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="achievements")
