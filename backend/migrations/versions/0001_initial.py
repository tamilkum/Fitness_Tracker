"""Create users and activities tables."""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False),
        sa.Column("last_name", sa.String(length=80), nullable=False),
        sa.Column("normalized_first_name", sa.String(length=80), nullable=False),
        sa.Column("normalized_last_name", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "normalized_first_name",
            "normalized_last_name",
            name="uq_user_normalized_name",
        ),
    )

    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sport", sa.String(length=20), nullable=False),
        sa.Column("distance_km", sa.Numeric(10, 3), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("steps", sa.Integer(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
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
        sa.CheckConstraint(
            "(distance_km IS NULL OR distance_km > 0) "
            "AND (duration_seconds IS NULL "
            "OR duration_seconds BETWEEN 1 AND 86400) "
            "AND (steps IS NULL OR steps BETWEEN 1 AND 2000000)",
            name="ck_activities_metric_ranges",
        ),
        sa.CheckConstraint(
            "points >= 0",
            name="ck_activities_points_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_activities_user_occurred_at",
        "activities",
        ["user_id", "occurred_at"],
    )
    op.create_index(
        "ix_activities_sport",
        "activities",
        ["sport"],
    )
    op.create_index(
        "ix_activities_occurred_at",
        "activities",
        ["occurred_at"],
    )


def downgrade() -> None:
    op.drop_table("activities")
    op.drop_table("users")
