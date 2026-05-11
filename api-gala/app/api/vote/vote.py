from typing import Annotated
from fastapi import APIRouter, HTTPException, Security
from loguru import logger
from pydantic import BaseModel, NonNegativeInt

from app.api.auth import AuthData, api_nei_auth, auth_responses
from app.api.time_slots.util import fetch_time_slots
from app.api.vote._utils import fetch_category, anonymize_category, is_voting_open
from app.core.db import DatabaseDep
from app.models.vote import VoteListing
from app.services.config import ConfigService
from app.services.vote import VoteService, AlreadyVotedError

router = APIRouter(tags=["Voting"])


class VoteForm(BaseModel):
    option: NonNegativeInt


@router.post(
    "/categories/{category_id}/vote",
    responses={
        **auth_responses,
        400: {"description": "Invalid user or option"},
        403: {"description": "Voting is closed"},
        409: {"description": "Already cast a vote"},
        500: {"description": "Internal server error"},
    },
)
async def cast_vote(
    category_id: int,
    form_data: VoteForm,
    db: DatabaseDep,
    auth: Annotated[AuthData, Security(api_nei_auth)],
) -> VoteListing:
    ts = await fetch_time_slots(db)
    if not is_voting_open(ts):
        raise HTTPException(status_code=403, detail="Voting is closed for this category")

    try:
        await VoteService.vote(db, auth.sub, category_id, form_data.option)
    except AlreadyVotedError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error casting vote: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    config = await ConfigService.get_config(db)
    category = await fetch_category(category_id, db)
    return anonymize_category(category, auth, ts, config.results_visible)
