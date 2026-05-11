from datetime import datetime, timezone
from fastapi import HTTPException, Security

from app.core.db import DatabaseDep
from app.core.db.types import DBType
from app.models.time_slots import TimeSlots, TIME_SLOTS_ID
from app.api.auth import AuthData, ScopeEnum, api_nei_auth


def _ensure_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


async def fetch_time_slots(db: DBType) -> TimeSlots:
    res = await TimeSlots.get_collection(db).find_one({"_id": TIME_SLOTS_ID})
    if res is None:
        return TimeSlots()
    return TimeSlots.parse_obj(res)


async def check_tables_open(
    db: DatabaseDep,
    auth: AuthData = Security(api_nei_auth),
) -> TimeSlots:
    time_slots = await fetch_time_slots(db)

    if ScopeEnum.ADMIN in auth.scopes or ScopeEnum.MANAGER_GALA in auth.scopes:
        return time_slots

    if time_slots.tables_start is None or time_slots.tables_end is None:
        raise HTTPException(status_code=409, detail="Tables aren't open")
    now = datetime.now(timezone.utc)
    if now < _ensure_utc(time_slots.tables_start) or now > _ensure_utc(time_slots.tables_end):
        raise HTTPException(status_code=409, detail="Tables aren't open")
    return time_slots


async def check_votes_open(
    db: DatabaseDep,
    auth: AuthData = Security(api_nei_auth),
) -> TimeSlots:
    time_slots = await fetch_time_slots(db)

    if ScopeEnum.ADMIN in auth.scopes or ScopeEnum.MANAGER_GALA in auth.scopes:
        return time_slots

    if time_slots.votes_start is None or time_slots.votes_end is None:
        raise HTTPException(status_code=409, detail="Votes aren't open")
    now = datetime.now(timezone.utc)
    if now < _ensure_utc(time_slots.votes_start) or now > _ensure_utc(time_slots.votes_end):
        raise HTTPException(status_code=409, detail="Votes aren't open")
    return time_slots
