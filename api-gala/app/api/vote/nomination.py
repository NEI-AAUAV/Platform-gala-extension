from typing import Annotated, List
from fastapi import APIRouter, HTTPException, Security, Query
from loguru import logger
from pydantic import BaseModel

from app.api.auth import AuthData, api_nei_auth, auth_responses
from app.core.db import DatabaseDep
from app.services.vote import VoteService

router = APIRouter(tags=["Nominations"])


class NominationForm(BaseModel):
    name: str


@router.post(
    "/categories/{category_id}/nominate",
    responses={
        **auth_responses,
        400: {"description": "Invalid input or already nominated"},
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
    """
    Submits a nomination for a particular category.
    
    - **category_id**: The ID of the category.
    - **name**: The name of the person being nominated.
    """
    try:
        await VoteService.nominate(db, auth.sub, category_id, form_data.name)
        return {"status": "success"}
    except ValueError as e:
        detail = str(e)
        if "closed" in detail:
            raise HTTPException(status_code=403, detail=detail)
        raise HTTPException(status_code=400, detail=detail)
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
    """
    Returns fuzzy-matched name suggestions for nominations.
    
    - **category_id**: The ID of the category.
    - **q**: The search query (min 2 characters).
    """
    try:
        return await VoteService.get_suggestions(db, category_id, q)
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
