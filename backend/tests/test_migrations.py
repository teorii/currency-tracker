from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from app.database import Base

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _config(url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", url)
    return config


def test_migrations_produce_exactly_the_models(tmp_path: Path) -> None:
    """The old SQL migration and the ORM disagreed about types and constraints.

    Nothing reconciled them because create_all was what actually ran. This
    fails if a model changes without a matching revision.
    """
    url = f"sqlite:///{tmp_path / 'drift.db'}"
    command.upgrade(_config(url), "head")

    engine = create_engine(url)
    with engine.connect() as connection:
        context = MigrationContext.configure(connection, opts={"compare_type": True})
        difference = compare_metadata(context, Base.metadata)
    engine.dispose()

    assert difference == [], f"models and migrations disagree: {difference}"


def test_the_migration_can_be_undone(tmp_path: Path) -> None:
    url = f"sqlite:///{tmp_path / 'roundtrip.db'}"
    config = _config(url)

    command.upgrade(config, "head")
    command.downgrade(config, "base")

    engine = create_engine(url)
    with engine.connect() as connection:
        remaining = set(Base.metadata.tables) & set(connection.dialect.get_table_names(connection))
    engine.dispose()

    assert remaining == set()
