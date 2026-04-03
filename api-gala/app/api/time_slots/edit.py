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
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_JANTAR_GALA]),
) -> TimeSlots:
    """Edits the time slots"""
    initial = await fetch_time_slots(db)

    now = datetime.now(tz=timezone.utc)

    registrationStart = form_data.registrationStart or initial.registrationStart
    if registrationStart.tzinfo is None:
        registrationStart = registrationStart.replace(tzinfo=timezone.utc)

    if not settings.ALLOW_TIME_SLOTS_PAST and now > registrationStart:
        raise HTTPException(
            status_code=400,
            detail="Registration start date cannot be before the current time",
        )

    registrationEnd = form_data.registrationEnd or initial.registrationEnd
    if registrationEnd.tzinfo is None:
        registrationEnd = registrationEnd.replace(tzinfo=timezone.utc)

    if registrationStart > registrationEnd:
        raise HTTPException(
            status_code=400, detail="Registration start date cannot be after end date"
        )

    nominationsStart = form_data.nominationsStart or initial.nominationsStart
    if nominationsStart.tzinfo is None:
        nominationsStart = nominationsStart.replace(tzinfo=timezone.utc)

    if not settings.ALLOW_TIME_SLOTS_PAST and now > nominationsStart:
        raise HTTPException(
            status_code=400,
            detail="Nominations start date cannot be before the current time",
        )

    nominationsEnd = form_data.nominationsEnd or initial.nominationsEnd
    if nominationsEnd.tzinfo is None:
        nominationsEnd = nominationsEnd.replace(tzinfo=timezone.utc)

    if nominationsStart > nominationsEnd:
        raise HTTPException(
            status_code=400, detail="Nominations start date cannot be after end date"
        )

    votesStart = form_data.votesStart or initial.votesStart
    if votesStart.tzinfo is None:
        votesStart = votesStart.replace(tzinfo=timezone.utc)

    if not settings.ALLOW_TIME_SLOTS_PAST and now > votesStart:
        raise HTTPException(
            status_code=400, detail="Votes start date cannot be before the current time"
        )

    votesEnd = form_data.votesEnd or initial.votesEnd
    if votesEnd.tzinfo is None:
        votesEnd = votesEnd.replace(tzinfo=timezone.utc)

    if votesStart > votesEnd:
        raise HTTPException(
            status_code=400, detail="Votes start date cannot be after end date"
        )

    tablesStart = form_data.tablesStart or initial.tablesStart
    if tablesStart.tzinfo is None:
        tablesStart = tablesStart.replace(tzinfo=timezone.utc)

    if not settings.ALLOW_TIME_SLOTS_PAST and now > tablesStart:
        raise HTTPException(
            status_code=400,
            detail="Tables start date cannot be before the current time",
        )

    tablesEnd = form_data.tablesEnd or initial.tablesEnd
    if tablesEnd.tzinfo is None:
        tablesEnd = tablesEnd.replace(tzinfo=timezone.utc)

    if tablesStart > tablesEnd:
        raise HTTPException(
            status_code=400, detail="Tables start date cannot be after end date"
        )

    galaStart = form_data.galaStart or initial.galaStart
    if galaStart.tzinfo is None:
        galaStart = galaStart.replace(tzinfo=timezone.utc)

    if not settings.ALLOW_TIME_SLOTS_PAST and now > galaStart:
        raise HTTPException(
            status_code=400,
            detail="Gala start date cannot be before the current time",
        )

    res = await TimeSlots.get_collection(db).find_one_and_update(
        {"_id": TIME_SLOTS_ID},
        {"$set": form_data.dict(exclude_unset=True)},
        return_document=ReturnDocument.AFTER,
    )

    return TimeSlots.parse_obj(res)
