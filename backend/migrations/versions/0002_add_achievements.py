"""Add achievements table."""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_achievements"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column(
            "unlocked_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "slug",
            name="uq_achievement_user_slug",
        ),
    )

    op.create_index(
        "ix_achievements_user_id",
        "achievements",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_achievements_user_id", table_name="achievements")
    op.drop_table("achievements")
