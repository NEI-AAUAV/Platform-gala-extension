"""
Table invite system — user-ID-based invitations (by Authentik sub/ID).

Endpoints:
  POST   /{table_id}/invite/accept      — accept an invite (joins table as confirmed)
  POST   /{table_id}/invite/{user_id}   — head sends invite to a registered user
  DELETE /{table_id}/invite/{user_id}   — head revokes invite OR invitee declines
  GET    /my-invites                    — returns tables where current user is invited
"""
from typing import Annotated, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from pymongo import ReturnDocument

from app.api.auth import api_nei_auth, AuthData, auth_responses
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.email import send_email
from app.models.table import Table, TablePerson, DishType
from app.models.user import User
from app.api.table._utils import fetch_table, table_head_permissions

router = APIRouter(tags=["Table Invites"])


def _is_head_or_admin(auth: AuthData, table: Table) -> bool:
    return table_head_permissions(auth, table)


# ---------------------------------------------------------------------------
# Invitee: accept an invite — declared FIRST so "accept" beats {user_id}
# ---------------------------------------------------------------------------


class AcceptInviteBody(BaseModel):
    dish: DishType = DishType.NORMAL
    allergies: str = ""


@router.post(
    "/{table_id}/invite/accept",
    response_model=Table,
    responses={
        **auth_responses,
        400: {"description": "Not invited or table full"},
        404: {"description": "Table not found"},
        409: {"description": "Already in a table"},
    },
)
async def accept_invite(
    table_id: int,
    body: AcceptInviteBody,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
) -> Table:
    """Accept a table invite — joins the table automatically as confirmed."""
    table = await fetch_table(table_id, db)

    if auth.sub not in (table.invites or []):
        raise HTTPException(status_code=400, detail="You have not been invited to this table")

    existing = await Table.get_collection(db).find_one({"persons.id": auth.sub})
    if existing:
        raise HTTPException(status_code=409, detail="Already in a table")

    total_persons = sum(1 + len(p.companions) for p in table.persons)
    if total_persons >= table.seats:
        raise HTTPException(status_code=400, detail="Table is full")

    user_dict = await User.get_collection(db).find_one({"_id": auth.sub})
    if not user_dict:
        raise HTTPException(status_code=400, detail="User not found")
    user = User.parse_obj(user_dict)

    person = TablePerson(
        id=auth.sub,
        allergies=user.food_allergies or body.allergies,
        dish=body.dish,
        confirmed=True,
        companions=user.companions,
    )

    updated = await Table.get_collection(db).find_one_and_update(
        {"_id": table_id},
        {
            "$push": {"persons": person.dict()},
            "$pull": {"invites": auth.sub},
        },
        return_document=ReturnDocument.AFTER,
    )

    await User.get_collection(db).update_one(
        {"_id": auth.sub}, {"$set": {"table_id": table_id}}
    )

    table_name = table.name or f"Mesa {table.id}"
    background_tasks.add_task(
        send_email,
        auth.email,
        f"Entraste na mesa \"{table_name}\"",
        settings=settings,
        template="table_joined",
        name=f"{auth.name} {auth.surname}",
        table=table_name,
    )

    return Table.parse_obj(updated)


# ---------------------------------------------------------------------------
# Head: invite a user by their user ID (auth.sub)
# ---------------------------------------------------------------------------


@router.post(
    "/{table_id}/invite/{user_id}",
    responses={
        **auth_responses,
        403: {"description": "Not the table head"},
        404: {"description": "Table or user not found"},
        409: {"description": "User already invited or already in a table"},
    },
)
async def invite_user(
    table_id: int,
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Table:
    """Send an invite to a registered user to join this table."""
    table = await fetch_table(table_id, db)

    if not _is_head_or_admin(auth, table):
        raise HTTPException(status_code=403, detail="Not the table head")

    if user_id == auth.sub:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    if user_id in (table.invites or []):
        raise HTTPException(status_code=409, detail="User already invited")

    invited_user = await User.get_collection(db).find_one({"_id": user_id, "is_registered": True})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found or not registered")

    existing_in_table = await Table.get_collection(db).find_one({"persons.id": user_id})
    if existing_in_table:
        raise HTTPException(status_code=409, detail="User is already in a table")

    total_persons = sum(1 + len(p.companions) for p in table.persons)
    if total_persons >= table.seats:
        raise HTTPException(status_code=409, detail="Table is full")

    updated = await Table.get_collection(db).find_one_and_update(
        {"_id": table_id},
        {"$addToSet": {"invites": user_id}},
        return_document=ReturnDocument.AFTER,
    )
    return Table.parse_obj(updated)


# ---------------------------------------------------------------------------
# Head: revoke invite | Invitee: decline invite
# ---------------------------------------------------------------------------


@router.delete(
    "/{table_id}/invite/{user_id}",
    responses={
        **auth_responses,
        403: {"description": "Not allowed"},
        404: {"description": "Table not found"},
    },
)
async def remove_invite(
    table_id: int,
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> Table:
    """Revoke an invite (head/admin) or decline an invite (the invited user themselves)."""
    table = await fetch_table(table_id, db)

    is_head = _is_head_or_admin(auth, table)
    is_self = auth.sub == user_id

    if not is_head and not is_self:
        raise HTTPException(status_code=403, detail="Not allowed")

    updated = await Table.get_collection(db).find_one_and_update(
        {"_id": table_id},
        {"$pull": {"invites": user_id}},
        return_document=ReturnDocument.AFTER,
    )
    return Table.parse_obj(updated)


# ---------------------------------------------------------------------------
# Any user: list tables they've been invited to
# ---------------------------------------------------------------------------


@router.get(
    "/my-invites",
    response_model=List[Table],
    responses={**auth_responses},
)
async def get_my_invites(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
) -> List[Table]:
    """Returns all tables where the current user has a pending invite."""
    results = await Table.get_collection(db).find(
        {"invites": auth.sub}
    ).to_list(None)
    return [Table.parse_obj(t) for t in results]
