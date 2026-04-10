from fastapi import APIRouter, HTTPException, Security
from loguru import logger

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.models.vote import VoteCategory
from app.services.storage import storage_client

from ._utils import fetch_category

router = APIRouter()


@router.delete(
    "/{category_id}",
    responses={
        **auth_responses,
        404: {"description": "Vote category not found"}
    },
)
async def delete_category(
    category_id: int,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> dict:
    """Deletes an existing vote category and its options' photos from storage."""
    # Fetch category first to get photo paths
    category = await fetch_category(category_id, db)

    # Delete photos from R2 storage if they exist
    if storage_client.enabled:
        for photo_path in category.photo_paths:
            if photo_path:
                try:
                    storage_client.delete_image(photo_path)
                except Exception as e:
                    logger.error(f"Failed to delete photo {photo_path} from R2: {e}")

    # Delete the category from database
    res = await VoteCategory.get_collection(db).delete_one({"_id": category_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vote category not found")

    return {"msg": "Category deleted successfully"}
from fastapi import APIRouter, HTTPException, Security
from loguru import logger

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.models.vote import VoteCategory
from app.services.storage import storage_client

from ._utils import fetch_category

router = APIRouter()


@router.delete(
    "/{category_id}",
    responses={
        **auth_responses,
        404: {"description": "Vote category not found"}
    },
)
async def delete_category(
    category_id: int,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_JANTAR_GALA]),
) -> dict:
    """Deletes an existing vote category and its options' photos from storage."""
    # Fetch category first to get photo paths
    category = await fetch_category(category_id, db)

    # Delete photos from R2 storage if they exist
    if storage_client.enabled:
        for photo_path in category.photo_paths:
            if photo_path:
                try:
                    storage_client.delete_image(photo_path)
                except Exception as e:
                    logger.error(f"Failed to delete photo {photo_path} from R2: {e}")

    # Delete the category from database
    res = await VoteCategory.get_collection(db).delete_one({"_id": category_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vote category not found")

    return {"msg": "Category deleted successfully"}
from fastapi import APIRouter, HTTPException, Security
from loguru import logger

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.models.vote import VoteCategory
from app.services.storage import storage_client

from ._utils import fetch_category

router = APIRouter()


@router.delete(
    "/{category_id}",
    responses={
        **auth_responses,
        404: {"description": "Vote category not found"}
    },
)
async def delete_category(
    category_id: int,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_JANTAR_GALA]),
) -> dict:
    """Deletes an existing vote category and its options' photos from storage."""
    # Fetch category first to get photo paths
    category = await fetch_category(category_id, db)

    # Delete photos from R2 storage if they exist
    if storage_client.enabled:
        for photo_path in category.photo_paths:
            if photo_path:
                try:
                    storage_client.delete_image(photo_path)
                except Exception as e:
                    logger.error(f"Failed to delete photo {photo_path} from R2: {e}")

    # Delete the category from database
    res = await VoteCategory.get_collection(db).delete_one({"_id": category_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vote category not found")

    return {"msg": "Category deleted successfully"}
