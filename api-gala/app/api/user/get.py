from fastapi import APIRouter, Security, HTTPException, Query
from typing import List, Optional, Annotated

from app.models.user import User
from app.core.db import DatabaseDep
from app.core.config import SettingsDep
from app.api.auth import AuthData, api_nei_auth, auth_responses, ScopeEnum
from app.services.registration import RegistrationService
from app.services.authentik_service import sync_email_based_registrations
from app.core.logging import logger

router = APIRouter()


@router.get(
    "/",
    responses=auth_responses,
)
async def list_users(
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> List[User]:
    """List all users"""
    res = await User.get_collection(db).find().to_list(None)
    return [User.parse_obj(user) for user in res]


@router.get(
    "/me",
    responses={
        **auth_responses,
        404: {"description": "User doesn't exist"},
    },
)
async def get_self(
    *,
    db: DatabaseDep,
    auth: AuthData = Security(api_nei_auth),
) -> User:
    """Fetches the self user information"""
    await sync_email_based_registrations(db, auth.sub, auth.email)
    await RegistrationService.apply_payment_deadline_policy(db)
    res = await User.get_collection(db).find_one({"_id": auth.sub})

    if res is None:
        email_lower = auth.email.strip().lower()
        # Look for any registered doc at this email (phantom or wrong-ID admin creation).
        orphan = await User.get_collection(db).find_one(
            {"email": email_lower, "is_registered": True}
        )
        if orphan:
            orphan_id = orphan["_id"]
            admin_created = orphan.get("admin_created", False)
            if admin_created:
                logger.warning(
                    "User {} ({}) has a phantom registration (id={}) that did not transfer — "
                    "likely email mismatch between admin input and Authentik account",
                    auth.sub, auth.email, orphan_id,
                )
            else:
                logger.warning(
                    "User {} ({}) has a registration under a different id={} (admin_created=False) — "
                    "admin may have used wrong Authentik account when registering",
                    auth.sub, auth.email, orphan_id,
                )
        raise HTTPException(status_code=404, detail="User doesn't exist")

    return User.parse_obj(res)


@router.get(
    "/search",
    responses={**auth_responses},
)
async def search_users(
    *,
    q: Annotated[str, Query(min_length=2)],
    db: DatabaseDep,
    settings: SettingsDep,
    auth: AuthData = Security(api_nei_auth),
) -> List[dict]:
    """Search ALL platform users via Authentik (for table invites)."""
    from app.services.authentik_service import fetch_all_users
    import re
    
    q_norm = q.strip()
    q_regex = {"$regex": re.escape(q_norm), "$options": "i"}

    # 1. Search in Authentik (may be empty if token lacks permissions)
    authentik_users = await fetch_all_users(settings, search=q_norm)

    # 2. Fallback/local search in Gala DB for already known users
    user_coll = User.get_collection(db)
    local_users = await user_coll.find(
        {
            "$or": [
                {"name": q_regex},
                {"email": q_regex},
            ]
        }
    ).to_list(20)

    # 3. Get registered status for Authentik users
    user_coll = User.get_collection(db)
    registered_ids = await user_coll.distinct(
        "_id",
        {"_id": {"$in": [u.pk for u in authentik_users]}, "is_registered": True},
    )
    registered_ids_set = set(registered_ids)

    # 4. Map to expected format and exclude self
    results: List[dict] = []
    seen_ids: set[int] = set()

    for user_doc in local_users:
        uid = int(user_doc["_id"])
        if uid == auth.sub:
            continue
        seen_ids.add(uid)
        results.append(
            {
                "id": uid,
                "name": user_doc.get("name", "") or "",
                "email": user_doc.get("email", "") or "",
                "is_registered": bool(user_doc.get("is_registered", False)),
            }
        )

    for u in authentik_users:
        if u.pk == auth.sub:
            continue
        if u.pk in seen_ids:
            continue
        results.append(
            {
                "id": u.pk,
                "name": u.name,
                "email": u.email,
                "is_registered": u.pk in registered_ids_set,
            }
        )

    return results[:10]


@router.get(
    "/me/table",
    responses={
        **auth_responses,
        404: {"description": "User or Table not found"},
    },
)
async def get_my_table(
    *,
    db: DatabaseDep,
    auth: AuthData = Security(api_nei_auth),
):
    """Returns the table the current user is in, if any."""
    user_res = await User.get_collection(db).find_one({"_id": auth.sub})
    if user_res is None:
        raise HTTPException(status_code=404, detail="User doesn't exist")
        
    user = User.parse_obj(user_res)
    if not user.table_id:
        return None
        
    from app.models.table import Table # Local import to avoid circular dependency
    table_res = await Table.get_collection(db).find_one({"_id": user.table_id})
    if not table_res:
        return None
        
    return Table.parse_obj(table_res)
