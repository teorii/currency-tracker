from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import CurrencyPair
from .rates import latest_rate_rows


@dataclass(frozen=True)
class DerivedRate:
    rate: float
    quoted_at: datetime
    # How the number was arrived at, so a caller can tell a quoted rate from
    # one that was computed through a third currency.
    basis: str
    via: str | None = None


def derive_rate(db: Session, base: str, target: str) -> DerivedRate | None:
    """Price base against target, using a pivot currency when neither direction is held.

    The provider quotes everything against one base, so a pair like EUR/JPY is
    never returned directly even though both legs are known.
    """
    if base == target:
        return DerivedRate(rate=1.0, quoted_at=datetime.now(UTC), basis="identity")

    direct = _quoted(db, base, target)
    if direct is not None:
        rate, quoted_at = direct
        return DerivedRate(rate=rate, quoted_at=quoted_at, basis="direct")

    reverse = _quoted(db, target, base)
    if reverse is not None and reverse[0] != 0:
        rate, quoted_at = reverse
        return DerivedRate(rate=1 / rate, quoted_at=quoted_at, basis="inverse")

    return _cross(db, base, target)


def _quoted(db: Session, base: str, target: str) -> tuple[float, datetime] | None:
    ranked = latest_rate_rows()
    row = db.execute(
        select(ranked.c.rate, ranked.c.timestamp)
        .join(CurrencyPair, CurrencyPair.id == ranked.c.currency_pair_id)
        .where(
            ranked.c.recency == 1,
            CurrencyPair.base_currency == base,
            CurrencyPair.target_currency == target,
        )
    ).first()
    return (row.rate, row.timestamp) if row else None


def _cross(db: Session, base: str, target: str) -> DerivedRate | None:
    """Both legs quoted against a shared currency give base/target by division."""
    ranked = latest_rate_rows()
    rows = db.execute(
        select(
            CurrencyPair.base_currency,
            CurrencyPair.target_currency,
            ranked.c.rate,
            ranked.c.timestamp,
        )
        .join(ranked, ranked.c.currency_pair_id == CurrencyPair.id)
        .where(ranked.c.recency == 1, CurrencyPair.target_currency.in_([base, target]))
    ).all()

    legs: dict[str, dict[str, tuple[float, datetime]]] = defaultdict(dict)
    for pivot, leg, rate, quoted_at in rows:
        legs[pivot][leg] = (rate, quoted_at)

    candidates = []
    for pivot, held in legs.items():
        if base not in held or target not in held:
            continue
        base_rate, base_at = held[base]
        target_rate, target_at = held[target]
        if base_rate == 0:
            continue
        candidates.append(
            DerivedRate(
                rate=target_rate / base_rate,
                # A derived rate is only as current as its staler leg.
                quoted_at=min(base_at, target_at),
                basis="cross",
                via=pivot,
            )
        )

    return max(candidates, key=lambda derived: derived.quoted_at) if candidates else None
