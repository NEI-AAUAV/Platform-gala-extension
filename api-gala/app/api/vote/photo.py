import uuid
from typing import Annotated
from fastapi import APIRouter, HTTPException, Security, UploadFile, File
from pymongo import ReturnDocument

from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.models.vote import VoteCategory
from app.services.storage import storage_client

from ._utils import fetch_category

router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


@router.put(
    "/{category_id}/options/{option_index}/photo",
    responses={
        **auth_responses,
        400: {"description": "Invalid file or option index"},
        404: {"description": "Vote category not found"},
        503: {"description": "R2 storage not configured"},
    },
)
async def upload_option_photo(
    category_id: int,
    option_index: int,
    *,
    db: DatabaseDep,
    image: Annotated[UploadFile, File(...)],
    _: Annotated[AuthData, Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_JANTAR_GALA])],
) -> VoteCategory:
    """Upload a photo for a specific option in a vote category. Stores it in Cloudflare R2."""
    if not storage_client.enabled:
        raise HTTPException(
            status_code=503,
            detail="Image upload is disabled: R2 storage is not configured.",
        )

    # Validate category exists
    category = await fetch_category(category_id, db)

    # Validate option index
    if option_index < 0 or option_index >= len(category.options):
        raise HTTPException(
            status_code=400,
            detail=f"Option index {option_index} out of range for category with {len(category.options)} options.",
        )

    # Validate content type
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{image.content_type}'. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    # Read and validate file size
    data = await image.read()
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
        )

    # Determine file extension from content type
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }
    ext = ext_map.get(image.content_type, "jpg")

    # Delete old image from R2 if it was an R2 URL
    old_photo_paths = category.photo_paths
    if option_index < len(old_photo_paths):
        storage_client.delete_image(old_photo_paths[option_index])

    # Build R2 key and upload
    key = f"gala/votes/{category_id}/{option_index}_{uuid.uuid4().hex}.{ext}"
    url = storage_client.upload_image(key, data, image.content_type)
    if url is None:
        raise HTTPException(status_code=503, detail="Failed to upload image to storage.")

    # Update photo_paths in the database
    # Ensure photo_paths list is long enough
    photo_paths = list(category.photo_paths)
    while len(photo_paths) <= option_index:
        photo_paths.append("")
    photo_paths[option_index] = url

    res = await VoteCategory.get_collection(db).find_one_and_update(
        {"_id": category_id},
        {"$set": {"photo_paths": photo_paths}},
        return_document=ReturnDocument.AFTER,
    )
    if res is None:
        raise HTTPException(status_code=404, detail="Vote category not found")

    return VoteCategory(**res)
