from datetime import MAXYEAR, datetime
from typing import List
from app.models.time_slots import TIME_SLOTS_ID, TimeSlots

from app.models.user import User
from app.core.db.types import DBType
from app.api.auth import AuthData, ScopeEnum

_TEST_EMAIL = "dev@dev.dev"


def auth_data(*, sub: int = 0, scopes: List[ScopeEnum] = []) -> AuthData:
    return AuthData(
        sub=sub, nmec=0, name="J", surname="C", email=_TEST_EMAIL, scopes=scopes
    )


async def create_test_user(*, id: int, db: DBType) -> None:
    test_user = User(_id=id, matriculation=None, nmec=1, email=_TEST_EMAIL, name="J")
    await User.get_collection(db).insert_one(test_user.dict(by_alias=True))


async def create_registered_test_user(*, id: int, db: DBType) -> None:
    test_user = User(
        _id=id, matriculation=None, nmec=1, email=_TEST_EMAIL, name="J",
        is_registered=True,
    )
    await User.get_collection(db).insert_one(test_user.dict(by_alias=True))


async def mark_open_timeslot(*, db: DBType) -> None:
    # Dates must be > _EPOCH (2026-01-01) or epoch_to_none converts them to None.
    # Start in the past (2026-01-02), end far in the future.
    time_slot = TimeSlots(
        votesStart=datetime(2026, 1, 2),
        votesEnd=datetime(MAXYEAR, 12, 31),
        tablesStart=datetime(2026, 1, 2),
        tablesEnd=datetime(MAXYEAR, 12, 31),
    )
    await TimeSlots.get_collection(db).update_one(
        {"_id": TIME_SLOTS_ID}, {"$set": time_slot.dict()}, upsert=True
    )


async def mark_closed_timeslot(*, db: DBType) -> None:
    # Both dates > epoch but end already passed → period is closed.
    time_slot = TimeSlots(
        votesStart=datetime(2026, 1, 2),
        votesEnd=datetime(2026, 1, 3),
        tablesStart=datetime(2026, 1, 2),
        tablesEnd=datetime(2026, 1, 3),
    )
    await TimeSlots.get_collection(db).update_one(
        {"_id": TIME_SLOTS_ID}, {"$set": time_slot.dict()}, upsert=True
    )


async def mark_open_nominations_timeslot(*, db: DBType) -> None:
    # Nominations window: started in the past, ends far in the future.
    time_slot = TimeSlots(
        nominationsStart=datetime(2026, 1, 2),
        nominationsEnd=datetime(MAXYEAR, 12, 31),
    )
    await TimeSlots.get_collection(db).update_one(
        {"_id": TIME_SLOTS_ID}, {"$set": time_slot.dict()}, upsert=True
    )


async def set_results_visible(*, db: DBType, visible: bool = True) -> None:
    from app.models.config import GlobalConfig, CONFIG_ID
    await GlobalConfig.get_collection(db).update_one(
        {"_id": CONFIG_ID},
        {"$set": {"results_visible": visible}},
        upsert=True,
    )
