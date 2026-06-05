from fastapi import APIRouter, HTTPException, Security
from loguru import logger
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError, OperationFailure

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.models.vote import VoteCategory
from app.utils import optional

from .create import VoteCategoryCreateForm

router = APIRouter()


@optional()
class VoteCategoryEditForm(VoteCategoryCreateForm):
    pass


@router.put(
    "/{category_id}/edit",
    responses={
        **auth_responses,
        404: {"description": "Vote not found"},
        409: {
            "description": "A vote category with the same (or similar) name already exists"
        },
        500: {"description": "Something went wrong"},
    },
)
async def edit_category(
    category_id: int,
    form_data: VoteCategoryEditForm,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> VoteCategory:
    """Edits an existing vote category"""
    updates = form_data.dict(exclude_unset=True)
    existing = await VoteCategory.get_collection(db).find_one({"_id": category_id})
    if existing is None:
        raise HTTPException(status_code=404, detail="Vote not found")

    existing_category = VoteCategory(**existing)
    if (
        "options" in updates
        and existing_category.votes
        and updates["options"] != existing_category.options
    ):
        raise HTTPException(
            status_code=400,
            detail="Cannot change options after votes have been cast",
        )

    try:
        res = await VoteCategory.get_collection(db).find_one_and_update(
            {"_id": category_id},
            {"$set": updates},
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Category with same (or similar) name already exists",
        )
    except OperationFailure as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail="Something went wrong")

    return VoteCategory(**res)
