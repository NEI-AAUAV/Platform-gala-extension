from fastapi import APIRouter, Security, HTTPException
from typing import List

from app.models.user import User
from app.core.db import DatabaseDep
from app.api.auth import AuthData, api_nei_auth, auth_responses, ScopeEnum

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
    res = await User.get_collection(db).find_one({"_id": auth.sub})

    if res is None:
        raise HTTPException(status_code=404, detail="User doesn't exist")

    return User.parse_obj(res)


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
