import importlib
import pkgutil
from datetime import datetime, timezone

from app.core.logging import logger
from app.core.db import migrations
from .types import DBType

_COLLECTION = "_migrations"


async def run_migrations(db: DBType) -> None:
    migration_modules = sorted(
        name
        for _, name, _ in pkgutil.iter_modules(migrations.__path__)
    )

    for module_name in migration_modules:
        module = importlib.import_module(f"app.core.db.migrations.{module_name}")
        migration_name: str = module.name

        already_ran = await db[_COLLECTION].find_one({"_id": migration_name})
        if already_ran:
            logger.debug(f"Migration {migration_name} already applied, skipping.")
            continue

        logger.info(f"Applying migration: {migration_name}")
        await module.run(db)
        await db[_COLLECTION].insert_one(
            {"_id": migration_name, "applied_at": datetime.now(timezone.utc)}
        )
        logger.info(f"Migration {migration_name} applied.")
