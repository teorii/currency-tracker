"""watched flag on pairs

Revision ID: 8c316b43705b
Revises: e5656c99a07b
Create Date: 2026-09-13 11:33:05.828303

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.currencies import DEFAULT_WATCHLIST

revision: str = "8c316b43705b"
down_revision: str | Sequence[str] | None = "e5656c99a07b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "currency_pairs",
        sa.Column("watched", sa.Boolean(), server_default="0", nullable=False),
    )

    # A database that already holds every pair the provider quotes would
    # otherwise come up with an empty watchlist. Seed the same default set a
    # fresh database gets, so the upgrade changes what is shown, not whether
    # anything is.
    pairs = sa.table(
        "currency_pairs",
        sa.column("target_currency", sa.String),
        sa.column("watched", sa.Boolean),
    )
    op.execute(
        pairs.update()
        .where(pairs.c.target_currency.in_(sorted(DEFAULT_WATCHLIST)))
        .values(watched=True)
    )


def downgrade() -> None:
    op.drop_column("currency_pairs", "watched")
