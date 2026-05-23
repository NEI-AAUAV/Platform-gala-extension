from typing import Any, List
from fastapi import APIRouter, Security, HTTPException

from app.api.auth import AuthData, ScopeEnum, api_nei_auth, auth_responses
from app.api.time_slots.util import fetch_time_slots
from app.core.db import DatabaseDep
from app.models.vote import Vote, VoteCategory, VoteListing
from app.services.config import ConfigService

from ._utils import fetch_category, anonymize_category, _now, _ensure_utc

router = APIRouter()


@router.get(
    "/categories",
    responses={
        **auth_responses,
    },
)
async def list_categories(
    *,
    db: DatabaseDep,
    auth: AuthData = Security(api_nei_auth),
) -> List[VoteListing]:
    """Lists all vote categories"""
    ts, config = await fetch_time_slots(db), await ConfigService.get_config(db)

    def mapper(category_res: Any) -> VoteListing:
        category = VoteCategory(**category_res)
        return anonymize_category(category, auth, ts, config.results_visible)

    res = await VoteCategory.get_collection(db).find().to_list(None)
    return list(map(mapper, res))


@router.get(
    "/{category_id}",
    responses={**auth_responses, 404: {"description": "Vote category not found"}},
)
async def get_category(
    category_id: int,
    *,
    db: DatabaseDep,
    auth: AuthData = Security(api_nei_auth),
) -> VoteListing:
    """Get a single vote category"""
    ts, config = await fetch_time_slots(db), await ConfigService.get_config(db)
    category = await fetch_category(category_id, db)
    
    # If not revealed yet, raise 404
    if category.reveal_at:
        reveal_at_utc = _ensure_utc(category.reveal_at)
        if _now() < reveal_at_utc:
            raise HTTPException(status_code=404, detail="Category not found")
            
    return anonymize_category(category, auth, ts, config.results_visible)


@router.get(
    "/{category_id}/votes",
    responses={**auth_responses, 404: {"description": "Vote category not found"}},
)
async def get_votes(
    category_id: int,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> List[Vote]:
    """Get a single vote category"""
    category = await fetch_category(category_id, db)
    return category.votes
