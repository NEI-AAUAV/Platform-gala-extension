from datetime import datetime
from pymongo import collation
from pymongo.errors import CollectionInvalid

from app.models.user import User
from app.models.table import Table
from app.models.time_slots import TimeSlots, TIME_SLOTS_ID
from app.models.limits import Limits, LIMITS_ID
from app.models.vote import VoteCategory
from app.core.logging import logger
from app.core.db._validators.table import table_validator
from app.core.db._validators.vote import vote_validator
from app.core.db.types import DBType
from app.core.db.counters import init_counters

name = "0001_initial"


async def run(db: DBType) -> None:
    await init_counters(db)

    try:
        await db.create_collection(User.collection(), check_exists=True)
    except CollectionInvalid:
        logger.debug("Users collection already exist")

    try:
        await db.create_collection(Table.collection(), check_exists=True)
    except CollectionInvalid:
        logger.debug("Tables collection already exist")

    try:
        await db.create_collection(VoteCategory.collection(), check_exists=True)
    except CollectionInvalid:
        logger.debug("Vote category collection already exist")

    try:
        await db.create_collection(TimeSlots.collection(), check_exists=True)
    except CollectionInvalid:
        logger.debug("Time slots collection already exist")

    try:
        await db.create_collection(Limits.collection(), check_exists=True)
    except CollectionInvalid:
        logger.debug("Limits collection already exist")

    await Table.get_collection(db).create_index("persons.id", unique=True, sparse=True)
    await db.command(
        {
            "collMod": Table.collection(),
            "validator": table_validator,
        },
    )

    await VoteCategory.get_collection(db).create_index(
        "category",
        unique=True,
        collation=collation.Collation(
            locale="pt", strength=collation.CollationStrength.PRIMARY
        ),
    )
    await db.command(
        {
            "collMod": VoteCategory.collection(),
            "validator": vote_validator,
        },
    )

    time_slot = TimeSlots(
        registrationStart=datetime(1970, 1, 1),
        registrationEnd=datetime(1970, 1, 1),
        nominationsStart=datetime(1970, 1, 1),
        nominationsEnd=datetime(1970, 1, 1),
        votesStart=datetime(1970, 1, 1),
        votesEnd=datetime(1970, 1, 1),
        tablesStart=datetime(1970, 1, 1),
        tablesEnd=datetime(1970, 1, 1),
        galaStart=datetime(1970, 1, 1),
    )
    await TimeSlots.get_collection(db).update_one(
        {"_id": TIME_SLOTS_ID}, {"$setOnInsert": time_slot.dict()}, upsert=True
    )

    limits = Limits(maxRegistrations=200)
    await Limits.get_collection(db).update_one(
        {"_id": LIMITS_ID}, {"$setOnInsert": limits.dict()}, upsert=True
    )
