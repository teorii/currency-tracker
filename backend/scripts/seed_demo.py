"""Back-fill synthetic hourly history so the chart has something to draw.

For development only. Real history arrives one quote an hour while the
refresh job runs; this prepends a random walk to each pair, starting from
its earliest existing rate and stepping back an hour at a time, so a fresh
checkout can see the UI populated without waiting. Existing rows are never
touched. Each run extends the history a further --days back from whatever
is earliest at the time, so running it twice fills twice as far.

    python scripts/seed_demo.py --days 14

Do not run it against a database whose history you intend to keep honest.
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert

from app.database import SessionLocal
from app.models import CurrencyPair, ExchangeRate

HOUR = timedelta(hours=1)
# Hourly FX moves are small; a tenth of a percent is on the lively side.
STEP_STDDEV = 0.001


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--days", type=int, default=7, help="how far back to fill")
    parser.add_argument("--seed", type=int, default=None, help="for a repeatable walk")
    parser.add_argument("--all", action="store_true", help="fill every pair, not only watched ones")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    db = SessionLocal()
    try:
        pairs = select(CurrencyPair)
        if not args.all:
            pairs = pairs.where(CurrencyPair.watched.is_(True))

        rows: list[dict] = []
        skipped = 0
        for pair in db.execute(pairs).scalars():
            earliest = db.execute(
                select(ExchangeRate)
                .where(ExchangeRate.currency_pair_id == pair.id)
                .order_by(ExchangeRate.timestamp)
                .limit(1)
            ).scalar_one_or_none()
            if earliest is None:
                skipped += 1
                continue

            rate = earliest.rate
            at = earliest.timestamp
            for _ in range(args.days * 24):
                at -= HOUR
                rate *= 1 + rng.gauss(0, STEP_STDDEV)
                rows.append({"currency_pair_id": pair.id, "rate": rate, "timestamp": at})

        if not rows:
            print("Nothing to fill: no pair has a real quote to walk back from.")
            return 1

        inserted = db.execute(insert(ExchangeRate).values(rows).on_conflict_do_nothing()).rowcount
        db.commit()

        total, oldest = db.execute(
            select(func.count(), func.min(ExchangeRate.timestamp)).select_from(ExchangeRate)
        ).one()
        print(f"Inserted {inserted} synthetic quotes.")
        if skipped:
            print(f"Skipped {skipped} pair(s) with no quote to walk back from.")
        print(
            f"The database now holds {total} quotes, the oldest from {oldest:%Y-%m-%d %H:%M} UTC."
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
