-- Currency Exchange Rate Tracker Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Creates initial tables for currency pairs and exchange rates

-- Create currency_pairs table
CREATE TABLE IF NOT EXISTS currency_pairs (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    target_currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on currency_pairs
CREATE INDEX IF NOT EXISTS idx_currency_pairs_base ON currency_pairs(base_currency);
CREATE INDEX IF NOT EXISTS idx_currency_pairs_target ON currency_pairs(target_currency);
CREATE INDEX IF NOT EXISTS idx_currency_pairs_created_at ON currency_pairs(created_at);
CREATE INDEX IF NOT EXISTS idx_currency_pairs_updated_at ON currency_pairs(updated_at);

-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    currency_pair_id INTEGER NOT NULL REFERENCES currency_pairs(id) ON DELETE CASCADE,
    rate DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on exchange_rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_pair_id ON exchange_rates(currency_pair_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_rate ON exchange_rates(rate);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_timestamp ON exchange_rates(timestamp);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_created_at ON exchange_rates(created_at);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated_at ON exchange_rates(updated_at);

-- Composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_currency_pair_timestamp ON exchange_rates(currency_pair_id, timestamp);

-- Add unique constraint to prevent duplicate rates for the same pair at the same timestamp
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pair_timestamp ON exchange_rates(currency_pair_id, timestamp);
