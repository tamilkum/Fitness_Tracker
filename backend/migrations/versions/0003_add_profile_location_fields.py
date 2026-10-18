"""Add age, date_of_birth, and location fields to users table."""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_profile_location_fields"
down_revision = "0002_add_achievements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("state_province", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("house_address", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "house_address")
    op.drop_column("users", "city")
    op.drop_column("users", "state_province")
    op.drop_column("users", "country")
    op.drop_column("users", "date_of_birth")
    op.drop_column("users", "age")
