from fastapi import APIRouter, Security
from pydantic import BaseModel, PositiveInt

from app.models.table import Table
from app.api.auth import AuthData, api_nei_auth, ScopeEnum, auth_responses
from app.core.db import DatabaseDep
from app.core.db.counters import get_next_table_id

router = APIRouter()


class TableCreateForm(BaseModel):
    seats: PositiveInt


@router.post(
    "/new",
    responses={
        **auth_responses,
    },
)
async def create_table(
    form_data: TableCreateForm,
    *,
    db: DatabaseDep,
    _: AuthData = Security(api_nei_auth, scopes=[ScopeEnum.MANAGER_GALA]),
) -> Table:
    """Creates a new table"""
    table_id = await get_next_table_id(db)
    table = Table(
        _id=table_id,
        name=None,
        head=None,
        seats=form_data.seats,
        persons=[],
    )

    await Table.get_collection(db).insert_one(table.dict(by_alias=True))

    return table
