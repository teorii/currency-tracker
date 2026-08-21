from datetime import date, datetime
from typing import Annotated

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
    message: str
    base_currency: CurrencyCode
    timestamp: datetime
    rates_count: int
    stored_count: int


class Deleted(BaseModel):
    message: str
