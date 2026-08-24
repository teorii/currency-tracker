"""initial schema

Revision ID: e5656c99a07b
Revises:
Create Date: 2026-08-24 16:11:11.441412

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.models import UTCDateTime

# revision identifiers, used by Alembic.
revision: str = "e5656c99a07b"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "currency_pairs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("base_currency", sa.String(length=3), nullable=False),
        sa.Column("target_currency", sa.String(length=3), nullable=False),
        sa.Column("created_at", UTCDateTime(), nullable=False),
        sa.Column("updated_at", UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("base_currency", "target_currency", name="uq_currency_pair"),
    )
    op.create_table(
        "exchange_rates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("currency_pair_id", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Float(), nullable=False),
        sa.Column("timestamp", UTCDateTime(), nullable=False),
        sa.Column("created_at", UTCDateTime(), nullable=False),
        sa.Column("updated_at", UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["currency_pair_id"], ["currency_pairs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("currency_pair_id", "timestamp", name="uq_rate_per_pair_and_time"),
    )


def downgrade() -> None:
    op.drop_table("exchange_rates")
    op.drop_table("currency_pairs")
