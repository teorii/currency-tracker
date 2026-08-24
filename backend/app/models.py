from datetime import UTC, datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    TypeDecorator,
    UniqueConstraint,
)

from .database import Base


class UTCDateTime(TypeDecorator):
    """A datetime column that is timezone-aware UTC on the way in and on the way out.

    Postgres hands back aware values for TIMESTAMPTZ while SQLite has no
    concept of a timezone and hands back naive ones. Without this the same
    column yields different types depending on the backend, which is the kind
    of difference that shows up in production and not in the tests.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Refusing to store a naive datetime. Pass an aware one.")
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


def utcnow() -> datetime:
    return datetime.now(UTC)


class CurrencyPair(Base):
    __tablename__ = "currency_pairs"
    # Every lookup is by both codes together, and the same pair twice is
    # meaningless, so one unique index does the work of the two it replaces.
    __table_args__ = (
        UniqueConstraint("base_currency", "target_currency", name="uq_currency_pair"),
    )

    id = Column(Integer, primary_key=True)
    base_currency = Column(String(3), nullable=False)
    target_currency = Column(String(3), nullable=False)
    created_at = Column(UTCDateTime, nullable=False, default=utcnow)
    updated_at = Column(UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow)


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    # A pair has one rate at any given quote time. The unique index this
    # creates also serves the only two reads there are: the history range
    # scan and the per-pair ranking behind /rates/latest.
    __table_args__ = (
        UniqueConstraint("currency_pair_id", "timestamp", name="uq_rate_per_pair_and_time"),
    )

    id = Column(Integer, primary_key=True)
    currency_pair_id = Column(
        Integer, ForeignKey("currency_pairs.id", ondelete="CASCADE"), nullable=False
    )
    rate = Column(Float, nullable=False)
    # When the quote was valid according to the provider, not when we stored it.
    timestamp = Column(UTCDateTime, nullable=False)
    created_at = Column(UTCDateTime, nullable=False, default=utcnow)
    updated_at = Column(UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow)
