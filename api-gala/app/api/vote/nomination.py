from typing import Annotated, List
from fastapi import APIRouter, HTTPException, Security, Query
from loguru import logger
from pydantic import BaseModel

from app.api.auth import AuthData, api_nei_auth, auth_responses
from app.api.time_slots.util import fetch_time_slots
from app.api.vote._utils import is_nominations_open
from app.core.db import DatabaseDep
from app.models.user import User
from app.services.vote import VoteService

router = APIRouter(tags=["Nominations"])


class NominationForm(BaseModel):
    name: str


@router.post(
    "/categories/{category_id}/nominate",
    responses={
        **auth_responses,
        400: {"description": "Invalid input"},
        403: {"description": "Nominations are closed"},
        500: {"description": "Internal server error"},
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
        raise HTTPException(status_code=403, detail="Only gala registrants can nominate")
    user = User.parse_obj(user_dict)
    if not user.is_registered or not user.registration_active:
        raise HTTPException(status_code=403, detail="Only gala registrants can nominate")

    ts = await fetch_time_slots(db)
    if not is_nominations_open(ts):
        raise HTTPException(status_code=403, detail="Nominations are closed for this category")

    try:
        await VoteService.nominate(db, auth.sub, category_id, form_data.name)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting nomination: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get(
    "/nominees/suggest",
    responses={
        **auth_responses,
        500: {"description": "Internal server error"},
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
    try:
        return await VoteService.get_suggestions(db, category_id, q)
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
