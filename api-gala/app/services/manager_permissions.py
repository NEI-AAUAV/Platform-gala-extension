from typing import List, Set
from fastapi import HTTPException, status
from app.core.config import Settings
from app.core.db.types import DBType
from app.api.auth import AuthData, ScopeEnum
from app.models.manager_permissions import ManagerPermission, ManagerPermissions
from app.services.authentik_service import fetch_group_members

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
    async def set_permissions(
        db: DBType,
        manager_id: int,
        permissions: List[ManagerPermission],
        name: str,
        email: str,
    ) -> ManagerPermissions:
        coll = ManagerPermissions.get_collection(db)
        await coll.update_one(
            {"_id": manager_id},
            {
                "$set": {
                    "permissions": [p.value for p in permissions],
                    "name": name,
                    "email": email,
                }
            },
            upsert=True,
        )
        doc = await coll.find_one({"_id": manager_id})
        return ManagerPermissions.parse_obj(doc)

    @staticmethod
    async def list_managers(db: DBType, settings: Settings) -> List[ManagerPermissions]:
        authentik_users = await fetch_group_members(settings, settings.AUTHENTIK_MANAGER_GALA_GROUP)

        coll = ManagerPermissions.get_collection(db)
        db_docs = await coll.find({}).to_list(length=200)
        db_by_id = {doc["_id"]: doc for doc in db_docs}

        if not authentik_users:
            return [ManagerPermissions.parse_obj(d) for d in db_docs]

        return [
            ManagerPermissions.parse_obj(
                db_by_id.get(
                    user.pk,
                    {"_id": user.pk, "name": user.name, "email": user.email, "permissions": []},
                )
            )
            for user in authentik_users
        ]

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
