# Database Migrations

This directory contains SQL migration scripts for setting up the database schema.

## Running Migrations

### Option 1: Using psql (Command Line)

```bash
# Connect to PostgreSQL
psql -U postgres -d currency_tracker

# Run the migration
\i migrations/001_initial_schema.sql

# Exit
\q
```

### Option 2: Using psql with file input

```bash
psql -U postgres -d currency_tracker -f migrations/001_initial_schema.sql
```

### Option 3: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on `currency_tracker` database
4. Select "Query Tool"
5. Open `migrations/001_initial_schema.sql`
6. Click "Execute" (F5)

### Option 4: Auto-creation (Default)

The application will automatically create tables on startup using SQLAlchemy's `Base.metadata.create_all()`. This is the default behavior and requires no manual migration.

## Migration Files

- **001_initial_schema.sql**: Creates initial tables (`currency_pairs` and `exchange_rates`) with indexes and constraints

## Notes

- Migrations use `CREATE TABLE IF NOT EXISTS` to be idempotent
- Indexes are created with `CREATE INDEX IF NOT EXISTS` to prevent errors on re-runs
- The unique constraint prevents duplicate rates for the same pair at the same timestamp
