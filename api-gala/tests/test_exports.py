import pytest
from httpx import AsyncClient
from app.api.auth import AuthData

@pytest.mark.asyncio
async def test_export_registrations_unauthorized(async_client: AsyncClient):
    response = await async_client.get("/api/gala/v1/admin/export/registrations")
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_export_registrations_admin(async_client: AsyncClient, mock_auth_data: AuthData):
    mock_auth_data.scopes = ["admin"]
    response = await async_client.get("/api/gala/v1/admin/export/registrations")
    assert response.status_code == 200
    assert response.headers["Content-Disposition"] == "attachment; filename=registrations.csv"

@pytest.mark.asyncio
async def test_export_tables_admin(async_client: AsyncClient, mock_auth_data: AuthData):
    mock_auth_data.scopes = ["admin"]
    response = await async_client.get("/api/gala/v1/admin/export/tables")
    assert response.status_code == 200
    assert response.headers["Content-Disposition"] == "attachment; filename=tables.csv"
