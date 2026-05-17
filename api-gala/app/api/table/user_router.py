from typing import Annotated
from pydantic import BaseModel
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from app.api.auth import api_nei_auth, AuthData, ScopeEnum, auth_responses
from app.api.time_slots.util import check_tables_open
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.email import send_email
from app.models.table import Table
from app.models.time_slots import TimeSlots
from app.models.user import User
from app.services.table import TableService
from app.services.storage import storage_client
from app.services.config import ConfigService
from app.api.table._utils import fetch_table, table_head_permissions, sanitize_table
from app.core.logging import logger


router = APIRouter(tags=["User Tables"])


class TableCreateBody(BaseModel):
    name: str
    seats: int = 11


@router.post(
    "/create",
    response_model=Table,
    responses={
        **auth_responses,
        400: {"description": "Invalid input or limit reached"},
        403: {"description": "Only gala registrants can create tables"},
    }
)
async def create_table(
    body: TableCreateBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    _: Annotated[TimeSlots, Depends(check_tables_open)],
):
    """Creates a new table for the user."""
    user_dict = await User.get_collection(db).find_one({"_id": auth.sub})
    if not user_dict:
        raise HTTPException(status_code=403, detail="Only gala registrants can create tables")
    user = User.parse_obj(user_dict)
    if not user.is_registered or not user.registration_active:
        raise HTTPException(status_code=403, detail="Only gala registrants can create tables")
    try:
        return await TableService.create_table(db, auth.sub, body.name, seats=body.seats)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{table_id}/join/{token}",
    response_model=Table,
    responses={
        **auth_responses,
        400: {"description": "Invalid token or table full"},
        403: {"description": "Only gala registrants can join tables"},
    }
)
async def join_table(
    table_id: int,
    token: str,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
    _: Annotated[TimeSlots, Depends(check_tables_open)],
):
    """Joins a table using an invite token."""
    user_dict = await User.get_collection(db).find_one({"_id": auth.sub})
    if not user_dict:
        raise HTTPException(status_code=403, detail="Only gala registrants can join tables")
    user = User.parse_obj(user_dict)
    if not user.is_registered or not user.registration_active:
        raise HTTPException(status_code=403, detail="Only gala registrants can join tables")
    try:
        table = await TableService.join_table(db, auth.sub, table_id=table_id, token=token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    table_name = table.name or f"Mesa {table.id}"
    config = await ConfigService.get_config(db)
    if config.email_notifications.table_joined:
        logger.info("Queueing table join email for {}", auth.email)
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
    return sanitize_table(auth, Table.parse_obj(table_dict))
