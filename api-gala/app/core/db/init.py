from .migrate import run_migrations
from .types import DBType


async def init_db(db: DBType) -> None:
    await run_migrations(db)
