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


def _ensure_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _validate_period(start_val, end_val, order_msg):
    start_val = _ensure_utc(start_val)
    end_val = _ensure_utc(end_val)
    if start_val > end_val:
        raise HTTPException(status_code=400, detail=order_msg)


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
    auth: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> TimeSlots:
    """Edits the time slots"""
    initial = await fetch_time_slots(db)

    # Admins can set any dates; non-admins cannot set dates in the past
    is_admin = ScopeEnum.ADMIN in auth.scopes
    allow_past = is_admin or settings.ALLOW_TIME_SLOTS_PAST
    now = datetime.now(tz=timezone.utc)

    def _check_not_past(val: datetime, msg: str) -> None:
        if not allow_past and _ensure_utc(val) < now:
            raise HTTPException(status_code=400, detail=msg)

    reg_start = form_data.registration_start or initial.registration_start
    reg_end = form_data.registration_end or initial.registration_end
    _check_not_past(reg_start, "A data de início das inscrições não pode estar no passado.")
    _validate_period(reg_start, reg_end, "A data de início das inscrições não pode ser depois do fim.")

    nom_start = form_data.nominations_start or initial.nominations_start
    nom_end = form_data.nominations_end or initial.nominations_end
    _check_not_past(nom_start, "A data de início das nomeações não pode estar no passado.")
    _validate_period(nom_start, nom_end, "A data de início das nomeações não pode ser depois do fim.")

    votes_start = form_data.votes_start or initial.votes_start
    votes_end = form_data.votes_end or initial.votes_end
    _check_not_past(votes_start, "A data de início das votações não pode estar no passado.")
    _validate_period(votes_start, votes_end, "A data de início das votações não pode ser depois do fim.")

    tables_start = form_data.tables_start or initial.tables_start
    tables_end = form_data.tables_end or initial.tables_end
    _check_not_past(tables_start, "A data de início das mesas não pode estar no passado.")
    _validate_period(tables_start, tables_end, "A data de início das mesas não pode ser depois do fim.")

    gala_start = form_data.gala_start or initial.gala_start
    _check_not_past(gala_start, "A data do jantar de gala não pode estar no passado.")

    res = await TimeSlots.get_collection(db).find_one_and_update(
        {"_id": TIME_SLOTS_ID},
        {"$set": form_data.dict(exclude_unset=True)},
        return_document=ReturnDocument.AFTER,
    )

    return TimeSlots.parse_obj(res)
