from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Annotated, Any

from app.core.db.types import DBType
from app.core.db import get_db
from app.api.auth import api_nei_auth, AuthData, auth_responses
from app.services.manager_permissions import ManagerPermissionsService, ManagerPermission
from app.models.table import Table
from app.models.user import User
from app.services.table import TableService
from app.services.config import ConfigService
from app.utils import generate_invite_token
from app.core.email import send_email
from app.core.config import SettingsDep

router = APIRouter(prefix="/tables", tags=["admin", "tables"])

@router.post("/create", responses={**auth_responses})
async def admin_create_table(
    name: str,
    seats: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Table:
    """Create a new empty table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    
    collection = Table.get_collection(db)
    new_id = await TableService._get_next_id(db)
    
    invite_token = generate_invite_token()
    
    table = Table(
        id=new_id,
        name=name,
        photo_url=None,
        invite_token=invite_token,
        head=None,
        seats=seats,
        persons=[]
    )
    
    await collection.insert_one(table.dict(by_alias=True))
    return table

@router.delete("/{table_id}", responses={**auth_responses, 404: {"description": "Table not found"}})
async def admin_delete_table(
    table_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Any:
    """Delete an existing table."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    
    collection = Table.get_collection(db)
    user_coll = User.get_collection(db)
    
    table_dict = await collection.find_one({"_id": table_id})
    if not table_dict:
        raise HTTPException(status_code=404, detail="Table not found")
        
    # Unset table_id for all users in this table
    await user_coll.update_many({"table_id": table_id}, {"$unset": {"table_id": ""}})
    
    # Delete table
    await collection.delete_one({"_id": table_id})
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
