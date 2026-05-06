from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List
from pydantic import BaseModel
from app.api.auth import api_nei_auth, ScopeEnum, AuthData, auth_responses
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.models.manager_permissions import ManagerPermission, ManagerPermissions
from app.services.manager_permissions import ManagerPermissionsService

router = APIRouter()

ERROR_FORBIDDEN = "Not enough permissions"


class PermissionsResponse(BaseModel):
    is_admin: bool
    permissions: List[str]


class SetPermissionsBody(BaseModel):
    permissions: List[ManagerPermission]
    name: str
    email: str


@router.get(
    "/managers/me",
    response_model=PermissionsResponse,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}},
)
async def get_my_permissions(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Returns the current user's admin permissions. Auto-registers manager-gala on first call."""
    is_admin = ScopeEnum.ADMIN in auth.scopes

    if is_admin:
        return PermissionsResponse(is_admin=True, permissions=[p.value for p in ManagerPermission])

    if ScopeEnum.MANAGER_GALA in auth.scopes:
        await ManagerPermissionsService.upsert_manager(db, auth)
        perms = await ManagerPermissionsService.get_permissions(db, auth.sub)
        return PermissionsResponse(is_admin=False, permissions=list(perms))

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)


@router.get(
    "/managers",
    response_model=List[ManagerPermissions],
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}},
)
async def list_managers(
    db: Annotated[DBType, Depends(get_db)],
    settings: SettingsDep,
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Lists all managers from Authentik group, merged with their stored permissions."""
    if ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
    return await ManagerPermissionsService.list_managers(db, settings)


@router.put(
    "/managers/{manager_id}/permissions",
    response_model=ManagerPermissions,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}},
)
async def set_manager_permissions(
    manager_id: int,
    body: SetPermissionsBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Sets the permissions for a specific manager (Admin only). Creates record if it doesn't exist yet."""
    if ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

    return await ManagerPermissionsService.set_permissions(
        db, manager_id, body.permissions, body.name, body.email
    )
