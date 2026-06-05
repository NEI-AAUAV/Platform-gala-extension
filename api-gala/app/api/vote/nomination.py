from typing import Annotated, List
from fastapi import APIRouter, HTTPException, Security, Query
from loguru import logger
from pydantic import BaseModel, root_validator

from app.api.auth import AuthData, api_nei_auth, auth_responses
from app.api.time_slots.util import fetch_time_slots
from app.api.vote._utils import is_nominations_open
from app.core.db import DatabaseDep
from app.models.user import User
from app.services.vote import VoteService

router = APIRouter(tags=["Nominations"])
GALA_REGISTRANTS_CAN_NOMINATE_ERROR = "Only gala registrants can nominate"
INTERNAL_SERVER_ERROR = "Internal server error"


class NominationForm(BaseModel):
    names: List[str]

    @root_validator(pre=True)
    def accept_legacy_name(cls, values):
        if "names" not in values and "name" in values:
            values["names"] = [values["name"]]
        return values


class BulkNominationItem(BaseModel):
    category_id: int
    names: List[str]


class BulkNominationForm(BaseModel):
    items: List[BulkNominationItem]


@router.post(
    "/categories/{category_id}/nominate",
    responses={
        **auth_responses,
        400: {"description": "Invalid input"},
        403: {"description": "Nominations are closed"},
        500: {"description": INTERNAL_SERVER_ERROR},
    }
)
async def submit_nomination(
    category_id: int,
    form_data: NominationForm,
    db: DatabaseDep,
    auth: Annotated[AuthData, Security(api_nei_auth)],
):
    user_dict = await User.get_collection(db).find_one({"_id": auth.sub})
    if not user_dict:
        raise HTTPException(status_code=403, detail=GALA_REGISTRANTS_CAN_NOMINATE_ERROR)
    user = User.parse_obj(user_dict)
    if not user.is_registered or not user.registration_active:
        raise HTTPException(status_code=403, detail=GALA_REGISTRANTS_CAN_NOMINATE_ERROR)

    ts = await fetch_time_slots(db)
    if not is_nominations_open(ts):
        raise HTTPException(status_code=403, detail="Nominations are closed for this category")

    try:
        await VoteService.nominate(db, auth.sub, category_id, form_data.names)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting nomination: {e}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)


@router.post(
    "/bulk_nominate",
    responses={
        **auth_responses,
        400: {"description": "Invalid input"},
        403: {"description": "Nominations are closed"},
        500: {"description": INTERNAL_SERVER_ERROR},
    }
)
async def bulk_nominate(
    form_data: BulkNominationForm,
    db: DatabaseDep,
    auth: Annotated[AuthData, Security(api_nei_auth)],
):
    user_dict = await User.get_collection(db).find_one({"_id": auth.sub})
    if not user_dict:
        raise HTTPException(status_code=403, detail=GALA_REGISTRANTS_CAN_NOMINATE_ERROR)
    user = User.parse_obj(user_dict)
    if not user.is_registered or not user.registration_active:
        raise HTTPException(status_code=403, detail=GALA_REGISTRANTS_CAN_NOMINATE_ERROR)

    ts = await fetch_time_slots(db)
    if not is_nominations_open(ts):
        raise HTTPException(status_code=403, detail="Nominations are closed")

    errors = []
    for item in form_data.items:
        try:
            await VoteService.nominate(db, auth.sub, item.category_id, item.names)
        except ValueError as e:
            errors.append({"category_id": item.category_id, "error": str(e)})
        except Exception as e:
            logger.error(f"Error in bulk nomination for category {item.category_id}: {e}")
            errors.append({"category_id": item.category_id, "error": INTERNAL_SERVER_ERROR})

    if errors:
        return {"status": "partial_success", "errors": errors}
    
    return {"status": "success"}


@router.get(
    "/nominees/suggest",
    responses={
        **auth_responses,
        403: {"description": "Only gala registrants can access nominations"},
        500: {"description": INTERNAL_SERVER_ERROR},
    },
    response_model=List[str]
)
async def get_nomination_suggestions(
    q: Annotated[str, Query(..., min_length=2)],
    db: DatabaseDep,
    auth: Annotated[AuthData, Security(api_nei_auth)],
    category_id: Annotated[int, Query(...)],
):
    user_dict = await User.get_collection(db).find_one({"_id": auth.sub})
    if not user_dict:
        raise HTTPException(status_code=403, detail="Only gala registrants can access nominations")
    user = User.parse_obj(user_dict)
    if not user.is_registered or not user.registration_active:
        raise HTTPException(status_code=403, detail="Only gala registrants can access nominations")
    ts = await fetch_time_slots(db)
    if not is_nominations_open(ts):
        raise HTTPException(status_code=403, detail="Nominations are closed")
    try:
        return await VoteService.get_suggestions(db, category_id, q)
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail=INTERNAL_SERVER_ERROR)
