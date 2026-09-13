from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

CurrencyCode = Annotated[
    str, StringConstraints(strip_whitespace=True, to_upper=True, pattern=r"^[A-Za-z]{3}$")
]


class RateSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    base_currency: CurrencyCode
    target_currency: CurrencyCode
    rate: float
    timestamp: datetime
    # Fractional change against the oldest quote inside the trailing window,
    # or None when only one quote falls inside it.
    change_24h: float | None = None
    # Every quote inside the trailing window, oldest first. Empty until a
    # second refresh has happened.
    sparkline: list[float] = []


class LatestRates(BaseModel):
    rates: list[RateSnapshot]
    count: int


class HistoryPoint(BaseModel):
    date: date
    timestamp: datetime
    rate: float


class RateHistory(BaseModel):
    base_currency: CurrencyCode
    target_currency: CurrencyCode
    # The resolved bounds, which are not always what the caller sent: a bare
    # end date is widened to cover the whole day.
    start_date: datetime
    end_date: datetime
    history: list[HistoryPoint]
    count: int


class FetchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    base_currency: CurrencyCode
    quoted_at: datetime
    received: int
    stored: int


class TrackedPair(BaseModel):
    base_currency: CurrencyCode
    target_currency: CurrencyCode
    watched: bool
    first_seen: datetime
    observations: int
    latest_quote_at: datetime | None = None


class TrackedPairs(BaseModel):
    pairs: list[TrackedPair]
    count: int


class WatchRequest(BaseModel):
    watched: bool


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["up", "down"]
    tracked_pairs: int | None = None
    latest_quote_at: datetime | None = None


class Conversion(BaseModel):
    base_currency: CurrencyCode
    target_currency: CurrencyCode
    amount: float
    rate: float
    converted: float
    quoted_at: datetime
    # direct is a rate the provider quoted, cross was computed through `via`.
    basis: Literal["identity", "direct", "inverse", "cross"]
    via: CurrencyCode | None = None


class Deleted(BaseModel):
    message: str
