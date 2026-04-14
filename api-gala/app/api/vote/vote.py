from typing import Annotated
from fastapi import APIRouter, HTTPException, Security, Query
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
    }
        400: {"description": "A user must be created first or the option is not valid"},
        409: {"description": "Already cast a vote in this category"},
        500: {"description": "Something went wrong"},
    },
)
async def cast_vote(
    category_id: int,
    form_data: VoteForm,
    db: DatabaseDep,
    auth: Annotated[AuthData, Security(api_nei_auth)],
) -> VoteListing:
    """
    Casts a vote for a particular category.
    
    - **category_id**: The ID of the category to vote in.
    - **option**: The index of the option chosen.
    """
    """Casts a vote for a particular category"""
    user = await User.get_collection(db).find_one({"_id": auth.sub})

    if user is None:
        raise HTTPException(status_code=400, detail="A user must be created first")

    vote = Vote(uid=auth.sub, option=form_data.option)

    ERR_ALREADY_VOTED = "Already cast a vote in this category"
    ERR_SOMETHING_WENT_WRONG = "Something went wrong"

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
        res = await VoteCategory.get_collection(db).find_one_and_update(
            {"_id": category_id, "votes.uid": {"$ne": auth.sub}},
            {"$push": {"votes": vote.dict()}},
            return_document=ReturnDocument.AFTER,
        )

    category = await fetch_category(category_id, db)
    return anonymize_category(category, auth)
        if res is None:
            raise NotFoundReCheck
    except (OperationFailure, NotFoundReCheck) as e:
        if any(vote.uid == auth.sub for vote in category.votes):
            raise HTTPException(
                status_code=409, detail=ERR_ALREADY_VOTED
            )

        logger.error(e)

        raise HTTPException(status_code=500, detail=ERR_SOMETHING_WENT_WRONG)

    return anonymize_category(VoteCategory(**res), auth)
