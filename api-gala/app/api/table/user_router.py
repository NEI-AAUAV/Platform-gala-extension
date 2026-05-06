from typing import Annotated
from pydantic import BaseModel
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from app.api.auth import api_nei_auth, AuthData, ScopeEnum, auth_responses
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.email import send_email
from app.models.table import Table
from app.services.table import TableService
from app.services.storage import storage_client
from app.services.config import ConfigService
from app.api.table._utils import fetch_table, table_head_permissions


router = APIRouter(tags=["User Tables"])


class TableCreateBody(BaseModel):
    name: str
    seats: int = 10


@router.post(
    "/create",
    response_model=Table,
    responses={
        **auth_responses,
        400: {"description": "Invalid input or limit reached"}
    }
)
async def create_table(
    body: TableCreateBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Creates a new table for the user."""
    try:
        return await TableService.create_table(db, auth.sub, body.name, seats=body.seats)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{table_id}/join/{token}",
    response_model=Table,
    responses={
        **auth_responses,
        400: {"description": "Invalid token or table full"}
    }
)
async def join_table(
    table_id: int,
    token: str,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
):
    """Joins a table using an invite token."""
    try:
        table = await TableService.join_table(db, auth.sub, table_id=table_id, token=token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    table_name = table.name or f"Mesa {table.id}"
    background_tasks.add_task(
        send_email,
        auth.email,
        f"Pedido de entrada na mesa \"{table_name}\"",
        settings=settings,
        template="table_joined",
        name=f"{auth.name} {auth.surname}",
        table=table_name,
    )

    return table


@router.delete(
    "/{table_id}/leave",
    responses={**auth_responses}
)
async def leave_table_named(
    table_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Leaves the current table."""
    # Note: user_router in table directory usually shouldn't conflict with main table router
    # but we should be careful with /table/{id}/leave vs /table/leave
    await TableService.leave_table(db, auth.sub)
    return {"status": "success"}


@router.post(
    "/{table_id}/photo",
    responses={
        **auth_responses,
        400: {"description": "Invalid file type"},
        403: {"description": "Not enough permissions"},
        404: {"description": "Table not found"},
        503: {"description": "Storage not configured"},
    },
)
async def upload_table_photo(
    table_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    file: Annotated[UploadFile, File(...)],
):
    """Uploads a photo for a table (head or admin only)."""
    config = await ConfigService.get_config(db)
    is_admin = ScopeEnum.ADMIN in auth.scopes or ScopeEnum.MANAGER_GALA in auth.scopes
    if not config.table_photo_enabled and not is_admin:
        raise HTTPException(status_code=403, detail="Table photo upload is disabled")
    table = await fetch_table(table_id, db)
    if not table_head_permissions(auth, table):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if not storage_client.enabled:
        raise HTTPException(status_code=503, detail="Storage not configured")
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG or WebP.")
    data = await file.read()
    url = storage_client.upload_image(f"tables/{table_id}_photo", data, file.content_type)
    if not url:
        raise HTTPException(status_code=503, detail="Failed to upload image.")
    await Table.get_collection(db).update_one({"_id": table_id}, {"$set": {"photo_url": url}})
    return {"url": url}


@router.get(
    "/invite/{token}",
    response_model=Table,
    responses={**auth_responses, 404: {"description": "Table not found"}}
)
async def get_table_by_token(
    token: str,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Fetches a table by its invite token."""
    table_coll = Table.get_collection(db)
    table_dict = await table_coll.find_one({"invite_token": token})
    if not table_dict:
        raise HTTPException(status_code=404, detail="Table not found")
    return Table.parse_obj(table_dict)
