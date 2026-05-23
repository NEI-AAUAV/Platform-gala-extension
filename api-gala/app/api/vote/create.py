from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Security
from loguru import logger
from pydantic import BaseModel, Field, validator
from pymongo.errors import DuplicateKeyError, OperationFailure

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.core.db.counters import get_next_vote_category_id
from app.models.vote import VoteCategory

router = APIRouter()


class VoteCategoryCreateForm(BaseModel):
    category: str = Field(..., min_length=3)
    description: Optional[str] = None
    min_nominees: int = 1
    max_nominees: int = 1
    options: List[str] = Field(default_factory=list)
    photo_paths: List[str] = Field(default_factory=list)
    reveal_at: Optional[datetime] = None
    is_hidden: bool = False

    @validator("photo_paths")
    def validate_lengths(cls, photo_paths, values):
        options = values.get("options", [])
        if len(options) != len(photo_paths):
            raise ValueError("options and photo_paths must have the same length")
        return photo_paths


@router.post(
    "/new",
    responses={
        **auth_responses,
        409: {
            "description": "A vote category with the same (or similar) name already exists"
        },
        500: {"description": "Something went wrong"},
    },
)
async def create_category(
    form_data: VoteCategoryCreateForm,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> VoteCategory:
    """Creates a new vote category"""
    category_id = await get_next_vote_category_id(db)
    category = VoteCategory(
        _id=category_id,
        category=form_data.category,
        description=form_data.description,
        min_nominees=form_data.min_nominees,
        max_nominees=form_data.max_nominees,
        reveal_at=form_data.reveal_at,
        is_hidden=form_data.is_hidden,
        options=form_data.options,
        photo_paths=form_data.photo_paths,
        votes=[],
    )

    try:
        await VoteCategory.get_collection(db).insert_one(category.dict(by_alias=True))
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Category with same (or similar) name already exists",
        )
    except OperationFailure as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail="Something went wrong")

    return category
