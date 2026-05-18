from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from typing import Annotated, Any, List

from app.core.db.types import DBType
from app.core.db import get_db
from app.api.auth import api_nei_auth, AuthData, auth_responses
from app.core.logging import logger
from app.services.manager_permissions import ManagerPermissionsService, ManagerPermission
from app.models.table import Table
from app.models.user import User
from app.services.table import TableService
from app.services.config import ConfigService
from app.core.email import send_email
from app.core.config import SettingsDep
from app.api.limits.util import fetch_limits

router = APIRouter(prefix="/tables", tags=["admin", "tables"])

@router.post("/create", responses={**auth_responses, 409: {"description": "Table limit reached"}})
async def admin_create_table(
    name: str,
    seats: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Table:
    """Create a new empty table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    limits = await fetch_limits(db)
    if limits.maxTablesCount is not None:
        current = await Table.get_collection(db).count_documents({})
        if current >= limits.maxTablesCount:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O limite de mesas foi atingido.",
            )
    return await TableService.create_empty_table(db, name, seats)

@router.delete("/{table_id}", responses={**auth_responses, 404: {"description": "Table not found"}})
async def admin_delete_table(
    table_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Any:
    """Delete an existing table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    if not await TableService.delete_table(db, table_id):
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}

@router.post("/{table_id}/members/{user_id}", responses={**auth_responses, 400: {"description": "Bad Request"}})
async def admin_add_member(
    table_id: int,
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
) -> Table:
    """Add a user to a table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    
    try:
        table = await TableService.join_table(db, user_id=user_id, table_id=table_id)
        
        # Send notification
        config = await ConfigService.get_config(db)
        if config.email_notifications.table_confirmed:
            user_dict = await User.get_collection(db).find_one({"_id": user_id})
            if user_dict:
                user = User.parse_obj(user_dict)
                table_name = table.name or f"Mesa {table.id}"
                logger.info("Queueing admin add-member email for {}", user.email)
                background_tasks.add_task(
                    send_email,
                    user.email,
                    f"Foste adicionado à mesa \"{table_name}\"",
                    settings=settings,
                    template="table_joined",
                    name=user.name,
                    table=table_name,
                )
        
        return table
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{table_id}/members/{user_id}/move", responses={**auth_responses, 400: {"description": "Bad Request"}})
async def admin_move_member(
    table_id: int,
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
) -> Table:
    """Move a user to a new table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    
    # Leave current table
    await TableService.leave_table(db, user_id=user_id)
    
    # Join new table
    try:
        table = await TableService.join_table(db, user_id=user_id, table_id=table_id)
        
        # Send notification
        config = await ConfigService.get_config(db)
        if config.email_notifications.table_confirmed:
            user_dict = await User.get_collection(db).find_one({"_id": user_id})
            if user_dict:
                user = User.parse_obj(user_dict)
                table_name = table.name or f"Mesa {table.id}"
                logger.info("Queueing admin move-member email for {}", user.email)
                background_tasks.add_task(
                    send_email,
                    user.email,
                    f"A tua mesa foi alterada para \"{table_name}\"",
                    settings=settings,
                    template="table_joined",
                    name=user.name,
                    table=table_name,
                )
        
        return table
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

async def _prune_table(
    table_doc: dict,
    registered_ids: set,
    user_coll: Any,
    table_coll: Any,
    removed: List[dict],
    processed: set,
) -> None:
    table_id = table_doc["_id"]
    orphans = [
        p["id"]
        for p in table_doc.get("persons", [])
        if p.get("id") not in registered_ids
    ]
    if not orphans:
        return

    for orphan_id in orphans:
        await table_coll.update_one({"_id": table_id}, {"$pull": {"persons": {"id": orphan_id}}})
        await user_coll.update_one({"_id": orphan_id}, {"$unset": {"table_id": ""}})
        removed.append({"user_id": orphan_id, "reason": "not_registered"})
        processed.add(orphan_id)
        logger.info("Pruned non-registered person {} from table {}", orphan_id, table_id)

    updated = await table_coll.find_one({"_id": table_id})
    if not updated:
        return
    remaining = updated.get("persons", [])
    if not remaining:
        await table_coll.delete_one({"_id": table_id})
        return
    confirmed_ids = [p["id"] for p in remaining if p.get("confirmed")]
    current_head = updated.get("head")
    fallback_head = confirmed_ids[0] if confirmed_ids else None
    new_head = current_head if current_head in confirmed_ids else fallback_head
    await table_coll.update_one({"_id": table_id}, {"$set": {"head": new_head}})


@router.post(
    "/prune",
    responses={**auth_responses},
    summary="Remove non-registered users from all tables",
)
async def admin_prune_tables(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Any:
    """
    Remove from all tables any person who is not registered (is_registered=False)
    or whose user document no longer exists. Handles head transfers and deletes
    tables that become empty as a result. Idempotent.
    """
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)

    user_coll = User.get_collection(db)
    table_coll = Table.get_collection(db)
    removed: List[dict] = []
    processed: set = set()

    registered_ids = {
        doc["_id"]
        async for doc in user_coll.find({"is_registered": True}, {"_id": 1})
    }

    all_tables = await table_coll.find({}).to_list(length=None)
    for table_doc in all_tables:
        await _prune_table(table_doc, registered_ids, user_coll, table_coll, removed, processed)

    # Clean up users with a stale table_id who were not in any persons array.
    stale_users = await user_coll.find(
        {"table_id": {"$exists": True}, "is_registered": {"$ne": True}}
    ).to_list(length=None)
    for user_doc in stale_users:
        user_id = user_doc["_id"]
        if user_id in processed:
            continue
        await user_coll.update_one({"_id": user_id}, {"$unset": {"table_id": ""}})
        removed.append({"user_id": user_id, "reason": "stale_table_id"})
        logger.info("Cleared stale table_id for non-registered user {}", user_id)

    return {"removed": removed, "count": len(removed)}


@router.delete("/{table_id}/members/{user_id}", responses={**auth_responses, 400: {"description": "User is not in this table"}})
async def admin_remove_member(
    table_id: int,
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Any:
    """Remove a user from a table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    
    # Check if user is in this table
    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict or user_dict.get("table_id") != table_id:
        raise HTTPException(status_code=400, detail="User is not in this table")
        
    await TableService.leave_table(db, user_id=user_id)
    return {"message": "User removed from table"}
