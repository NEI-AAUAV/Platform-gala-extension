from typing import Annotated
from fastapi import APIRouter, HTTPException, Security
from loguru import logger
from pydantic import BaseModel, NonNegativeInt

from app.api.auth import AuthData, api_nei_auth, auth_responses
from app.core.db import DatabaseDep
from app.models.vote import VoteListing
from app.services.vote import VoteService
from ._utils import fetch_category, anonymize_category

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
    """Casts a vote for a particular category."""
    category = await fetch_category(category_id, db)
    if form_data.option >= len(category.options):
        raise HTTPException(status_code=400, detail="Not a valid option")

    try:
        await VoteService.vote(db, auth.sub, category_id, form_data.option)
    except ValueError as e:
        detail = str(e)
        if "closed" in detail:
            raise HTTPException(status_code=403, detail=detail)
        if "already voted" in detail:
            raise HTTPException(status_code=409, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
    except Exception as e:
        logger.error(f"Error casting vote: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    category = await fetch_category(category_id, db)
    return anonymize_category(category, auth)
