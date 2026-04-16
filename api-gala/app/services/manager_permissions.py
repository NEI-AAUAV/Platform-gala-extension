from typing import List, Set
from fastapi import HTTPException, status
from app.core.db.types import DBType
from app.api.auth import AuthData, ScopeEnum
from app.models.manager_permissions import ManagerPermission, ManagerPermissions

ERROR_FORBIDDEN = "Not enough permissions"


class ManagerPermissionsService:
    @staticmethod
    async def upsert_manager(db: DBType, auth: AuthData) -> None:
        coll = ManagerPermissions.get_collection(db)
        await coll.update_one(
            {"_id": auth.sub},
            {"$setOnInsert": {"permissions": []}, "$set": {"name": auth.name, "email": auth.email}},
            upsert=True,
        )

    @staticmethod
    async def get_permissions(db: DBType, manager_id: int) -> Set[str]:
        coll = ManagerPermissions.get_collection(db)
        doc = await coll.find_one({"_id": manager_id})
        if not doc:
            return set()
        return set(doc.get("permissions", []))

    @staticmethod
    async def set_permissions(db: DBType, manager_id: int, permissions: List[ManagerPermission]) -> ManagerPermissions:
        coll = ManagerPermissions.get_collection(db)
        await coll.update_one(
            {"_id": manager_id},
            {"$set": {"permissions": [p.value for p in permissions]}},
        )
        doc = await coll.find_one({"_id": manager_id})
        return ManagerPermissions.parse_obj(doc)

    @staticmethod
    async def list_managers(db: DBType) -> List[ManagerPermissions]:
        coll = ManagerPermissions.get_collection(db)
        docs = await coll.find({}).to_list(length=200)
        return [ManagerPermissions.parse_obj(d) for d in docs]

    @staticmethod
    async def require_feature(db: DBType, auth: AuthData, feature: ManagerPermission) -> None:
        if ScopeEnum.ADMIN in auth.scopes:
            return
        if ScopeEnum.MANAGER_GALA not in auth.scopes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        perms = await ManagerPermissionsService.get_permissions(db, auth.sub)
        if feature.value not in perms:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

    @staticmethod
    async def require_config_access(db: DBType, auth: AuthData) -> None:
        """Config is accessible to managers with registration OR homepage permission."""
        if ScopeEnum.ADMIN in auth.scopes:
            return
        if ScopeEnum.MANAGER_GALA not in auth.scopes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        perms = await ManagerPermissionsService.get_permissions(db, auth.sub)
        if ManagerPermission.REGISTRATION.value not in perms and ManagerPermission.HOMEPAGE.value not in perms:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
