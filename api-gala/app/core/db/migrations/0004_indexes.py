from app.models.user import User
from app.models.vote import VoteCategory
from app.core.db.types import DBType

name = "0004_indexes"


async def run(db: DBType) -> None:
    await User.get_collection(db).create_index("is_registered")
    await User.get_collection(db).create_index([("bus_option", 1), ("is_companion_of", 1)])
    await User.get_collection(db).create_index("registration_active")
    await VoteCategory.get_collection(db).create_index("votes.uid")
