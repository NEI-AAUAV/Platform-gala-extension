import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_export_registrations_unauthorized(async_client: AsyncClient):
    response = await async_client.get("/api/gala/v1/admin/export/registrations")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_export_registrations_admin(async_client_admin: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(return_value=None)
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[])
    test_db.users.find = MagicMock(return_value=cursor_mock)

    response = await async_client_admin.get("/api/gala/v1/admin/export/registrations")
    assert response.status_code == 200
    assert response.headers["Content-Disposition"] == "attachment; filename=registrations.csv"


@pytest.mark.asyncio
async def test_export_tables_admin(async_client_admin: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(return_value=None)
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[])
    test_db.table_groups.find = MagicMock(return_value=cursor_mock)

    response = await async_client_admin.get("/api/gala/v1/admin/export/tables")
    assert response.status_code == 200
    assert response.headers["Content-Disposition"] == "attachment; filename=tables.csv"