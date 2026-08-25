import logging
from dataclasses import dataclass
from datetime import UTC, datetime

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

CODE_LENGTH = 3


class ExchangeRateError(RuntimeError):
    """The upstream rate provider could not be reached or gave back nonsense."""


@dataclass(frozen=True)
class LiveQuotes:
    """One reading from the provider: every rate it quoted, and when."""

    base: str
    quoted_at: datetime
    rates: dict[str, float]


async def fetch_live_quotes() -> LiveQuotes:
    settings = get_settings()

    try:
        async with httpx.AsyncClient(timeout=settings.exchange_rate_timeout_seconds) as client:
            response = await client.get(
                f"{settings.exchange_rate_api_base}/live",
                params={"access_key": settings.exchange_rate_api_key},
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise ExchangeRateError("The exchange rate provider timed out.") from exc
    except httpx.HTTPStatusError as exc:
        raise ExchangeRateError(
            f"The exchange rate provider returned {exc.response.status_code}."
        ) from exc
    except httpx.RequestError as exc:
        raise ExchangeRateError("Could not reach the exchange rate provider.") from exc

    return parse_live_response(response.json())


def parse_live_response(payload: dict) -> LiveQuotes:
    if not payload.get("success") or "quotes" not in payload:
        raise ExchangeRateError(
            f"The exchange rate provider rejected the request: {_reason(payload)}"
        )

    base = payload.get("source", "USD")
    rates: dict[str, float] = {}
    ignored = 0

    for key, value in payload["quotes"].items():
        target = key[len(base) :] if key.startswith(base) else ""
        if len(target) != CODE_LENGTH or not target.isalpha() or target == base:
            ignored += 1
            continue
        if not isinstance(value, int | float) or isinstance(value, bool):
            ignored += 1
            continue
        rates[target] = float(value)

    if ignored:
        # Silently dropping these is how a provider changing its key format
        # turns into an empty chart rather than something anyone notices.
        logger.warning("Ignored %d quote(s) that were not a usable %s pair", ignored, base)

    if not rates:
        raise ExchangeRateError("The exchange rate provider returned no usable quotes.")

    return LiveQuotes(base=base, quoted_at=_quote_time(payload), rates=rates)


def _reason(payload: dict) -> str:
    error = payload.get("error")
    if isinstance(error, dict) and error.get("info"):
        return str(error["info"])
    return "no reason given"


def _quote_time(payload: dict) -> datetime:
    """When the provider says its quotes were taken, which beats our own clock."""
    reported = payload.get("timestamp")
    if isinstance(reported, int | float) and not isinstance(reported, bool):
        return datetime.fromtimestamp(reported, tz=UTC)

    logger.warning("Provider sent no usable timestamp; recording the fetch time instead")
    return datetime.now(UTC)
