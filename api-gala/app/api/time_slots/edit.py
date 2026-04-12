from datetime import datetime, timezone
from app.core.config import SettingsDep
from fastapi import APIRouter, HTTPException, Security
from pymongo import ReturnDocument

from app.utils import optional
from app.core.db import DatabaseDep
from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.models.time_slots import TimeSlots, TIME_SLOTS_ID

from .util import fetch_time_slots

router = APIRouter()


@optional()
class TimeSlotsEditForm(TimeSlots):
    pass


def _validate_period(start_val, end_val, start_msg, order_msg, allow_past, now):
    if start_val.tzinfo is None:
        start_val = start_val.replace(tzinfo=timezone.utc)
    if not allow_past and now > start_val:
        raise HTTPException(status_code=400, detail=start_msg)

    if end_val.tzinfo is None:
        end_val = end_val.replace(tzinfo=timezone.utc)
    if start_val > end_val:
        raise HTTPException(status_code=400, detail=order_msg)


def _validate_start(start_val, start_msg, allow_past, now):
    if start_val.tzinfo is None:
        start_val = start_val.replace(tzinfo=timezone.utc)
    if not allow_past and now > start_val:
        raise HTTPException(status_code=400, detail=start_msg)


@router.put(
    "/",
    responses={
        **auth_responses,
        400: {"description": "An end date appears before a start date"},
    },
)
async def edit_time_slots(
    form_data: TimeSlotsEditForm,
    *,
    db: DatabaseDep,
    settings: SettingsDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> TimeSlots:
    """Edits the time slots"""
    initial = await fetch_time_slots(db)

    now = datetime.now(tz=timezone.utc)
    allow_past = settings.ALLOW_TIME_SLOTS_PAST

    _validate_period(
        form_data.registration_start or initial.registration_start,
        form_data.registration_end or initial.registration_end,
        "Registration start date cannot be before the current time",
        "Registration start date cannot be after end date",
        allow_past,
        now,
    )

    _validate_period(
        form_data.nominations_start or initial.nominations_start,
        form_data.nominations_end or initial.nominations_end,
        "Nominations start date cannot be before the current time",
        "Nominations start date cannot be after end date",
        allow_past,
        now,
    )

    _validate_period(
        form_data.votes_start or initial.votes_start,
        form_data.votes_end or initial.votes_end,
        "Votes start date cannot be before the current time",
        "Votes start date cannot be after end date",
        allow_past,
        now,
    )

    _validate_period(
        form_data.tables_start or initial.tables_start,
        form_data.tables_end or initial.tables_end,
        "Tables start date cannot be before the current time",
        "Tables start date cannot be after end date",
        allow_past,
        now,
    )

    _validate_start(
        form_data.gala_start or initial.gala_start,
        "Gala start date cannot be before the current time",
        allow_past,
        now,
    )

    res = await TimeSlots.get_collection(db).find_one_and_update(
        {"_id": TIME_SLOTS_ID},
        {"$set": form_data.dict(exclude_unset=True)},
        return_document=ReturnDocument.AFTER,
    )

    return TimeSlots.parse_obj(res)
