from sqlalchemy import Column, Integer, String, DateTime, Float, Index, ForeignKey
from .database import Base
from datetime import datetime

class CurrencyPair(Base):
    __tablename__ = "currency_pairs"
    id = Column(Integer, primary_key=True)
    base_currency = Column(String, nullable=False, index=True)
    target_currency = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, index=True)

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    __table_args__ = (Index("idx_currency_pair_timestamp", "currency_pair_id", "timestamp"),)
    id = Column(Integer, primary_key=True)
    currency_pair_id = Column(Integer, ForeignKey("currency_pairs.id"), index=True)
    rate = Column(Float, nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now, index=True)
    updated_at = Column(DateTime, default=datetime.now, index=True)