from typing import Any, Optional
from fastapi import HTTPException

from app.core.db.types import DBType
from app.models.table import Table
from app.api.auth import AuthData, ScopeEnum
from app.core.logging import logger


def table_head_check_override(auth: AuthData) -> bool:
    return (
        ScopeEnum.ADMIN in auth.scopes or ScopeEnum.MANAGER_GALA in auth.scopes
    )


def table_head_permissions(auth: AuthData, table: Table) -> bool:
    first_person_id = table.persons[0].id if table.persons else None
    return (
        table_head_check_override(auth)
        or table.head == auth.sub
        or table.owner_id == auth.sub
        or first_person_id == auth.sub
    )


def query_check_table_head_permissions(
    auth: AuthData, query: dict[str, Any]
) -> dict[str, Any]:
    if not table_head_check_override(auth):
        query["$or"] = [
            {"head": auth.sub},
            {"owner_id": auth.sub},
            {"persons.0.id": auth.sub},
        ]

    return query


def head_permission_check(
    auth: AuthData,
    table: Table,
) -> None:
    if not table_head_permissions(auth, table):
        first_person_id = table.persons[0].id if table.persons else None
        logger.warning(
            "Table permission denied | auth.sub={} | table_id={} | head={} | owner_id={} | first_person_id={}",
            auth.sub,
            table.id,
            table.head,
            table.owner_id,
            first_person_id,
        )
        raise HTTPException(status_code=403, detail="Not enough permissions")


def sanitize_table(auth: Optional[AuthData], table: Table) -> Table:
    if auth is None or not table_head_permissions(auth, table):
        table.persons = list(
            filter(
                lambda person: person.confirmed
                or (auth is not None and person.id == auth.sub),
                table.persons,
            )
        )
        table.invites = []
        table.invite_token = None

    return table


async def fetch_table(table_id: int, db: DBType) -> Table:
    res = await Table.get_collection(db).find_one({"_id": table_id})

    if res is None:
        raise HTTPException(status_code=404, detail="Table not found")

    return Table.parse_obj(res)
