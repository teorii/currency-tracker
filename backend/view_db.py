from app.database import SessionLocal
from app.models import CurrencyPair, ExchangeRate
from sqlalchemy import desc

db = SessionLocal()

print("=== Currency Pairs ===")
pairs = db.query(CurrencyPair).all()
print(f"Total pairs: {len(pairs)}")
for pair in pairs[:10]:
    print(f"  {pair.id}: {pair.base_currency}/{pair.target_currency}")

print("\n=== Exchange Rates (Latest 20) ===")
rates = db.query(ExchangeRate).order_by(desc(ExchangeRate.timestamp)).limit(20).all()
for rate in rates:
    pair = db.query(CurrencyPair).filter(CurrencyPair.id == rate.currency_pair_id).first()
    print(f"  {pair.base_currency}/{pair.target_currency}: {rate.rate} at {rate.timestamp}")

print(f"\nTotal exchange rates: {db.query(ExchangeRate).count()}")

db.close()
