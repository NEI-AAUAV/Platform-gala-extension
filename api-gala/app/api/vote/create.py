from typing import Annotated, List, Self
from fastapi import APIRouter, HTTPException, Security
from loguru import logger
from pydantic import BaseModel, Field, model_validator
from pymongo.errors import DuplicateKeyError, OperationFailure

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.core.db.counters import getNextVoteCategoryId
from app.models.vote import VoteCategory

router = APIRouter()


class VoteCategoryCreateForm(BaseModel):
    category: Annotated[str, Field(min_length=3)]
    options: Annotated[List[str], Field(min_items=2)]
    photo_paths: Annotated[List[str], Field(min_items=2)]

    @model_validator(mode="after")
    def validate_lengths(self) -> Self:
        if len(self.options) != len(self.photo_paths):
            raise ValueError("options and photo_paths must have the same length")
        return self


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
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_JANTAR_GALA]),
) -> VoteCategory:
    """Creates a new vote category"""
    category_id = await getNextVoteCategoryId(db)
    category = VoteCategory(
        _id=category_id,
        category=form_data.category,
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
