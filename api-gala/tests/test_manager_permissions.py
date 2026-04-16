import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient


MANAGER_DOC = {
    "_id": 42,
    "name": "Manager Gala",
    "email": "manager@ua.pt",
    "permissions": ["registration", "tables"],
}


# ── GET /admin/managers/me ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_my_permissions_as_admin(async_client_admin: AsyncClient):
    resp = await async_client_admin.get("/api/gala/v1/admin/managers/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_admin"] is True
    assert set(data["permissions"]) == {"registration", "tables", "categories", "homepage", "buses"}


@pytest.mark.asyncio
async def test_get_my_permissions_as_manager(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.update_one = AsyncMock()
    test_db.manager_permissions.find_one = AsyncMock(return_value=MANAGER_DOC)

    resp = await async_client_manager.get("/api/gala/v1/admin/managers/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_admin"] is False
    assert set(data["permissions"]) == {"registration", "tables"}


@pytest.mark.asyncio
async def test_get_my_permissions_unauthenticated(async_client: AsyncClient):
    resp = await async_client.get("/api/gala/v1/admin/managers/me")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_my_permissions_manager_auto_registers(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.update_one = AsyncMock()
    test_db.manager_permissions.find_one = AsyncMock(return_value=None)

    resp = await async_client_manager.get("/api/gala/v1/admin/managers/me")
    assert resp.status_code == 200
    assert resp.json()["permissions"] == []
    test_db.manager_permissions.update_one.assert_called_once()


# ── GET /admin/managers ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_managers_as_admin(async_client_admin: AsyncClient, test_db):
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[MANAGER_DOC])
    test_db.manager_permissions.find = MagicMock(return_value=cursor_mock)

    resp = await async_client_admin.get("/api/gala/v1/admin/managers")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["email"] == "manager@ua.pt"
    assert set(data[0]["permissions"]) == {"registration", "tables"}


@pytest.mark.asyncio
async def test_list_managers_forbidden_for_manager(async_client_manager: AsyncClient):
    resp = await async_client_manager.get("/api/gala/v1/admin/managers")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_managers_forbidden_for_default(async_client: AsyncClient):
    resp = await async_client.get("/api/gala/v1/admin/managers")
    assert resp.status_code == 403


# ── PUT /admin/managers/{id}/permissions ────────────────────────────────────

@pytest.mark.asyncio
async def test_set_permissions_as_admin(async_client_admin: AsyncClient, test_db):
    updated_doc = {**MANAGER_DOC, "permissions": ["buses"]}
    test_db.manager_permissions.find_one = AsyncMock(side_effect=[MANAGER_DOC, updated_doc])
    test_db.manager_permissions.update_one = AsyncMock()

    resp = await async_client_admin.put(
        "/api/gala/v1/admin/managers/42/permissions",
        json={"permissions": ["buses"]},
    )
    assert resp.status_code == 200
    assert resp.json()["permissions"] == ["buses"]


@pytest.mark.asyncio
async def test_set_permissions_invalid_permission(async_client_admin: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(return_value=MANAGER_DOC)

    resp = await async_client_admin.put(
        "/api/gala/v1/admin/managers/42/permissions",
        json={"permissions": ["nonexistent_feature"]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_set_permissions_manager_not_found(async_client_admin: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(return_value=None)

    resp = await async_client_admin.put(
        "/api/gala/v1/admin/managers/999/permissions",
        json={"permissions": ["registration"]},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_set_permissions_forbidden_for_manager(async_client_manager: AsyncClient):
    resp = await async_client_manager.put(
        "/api/gala/v1/admin/managers/1/permissions",
        json={"permissions": ["registration"]},
    )
    assert resp.status_code == 403


# ── Feature-gated admin endpoints ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_registrations_manager_with_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(return_value=MANAGER_DOC)
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[])
    test_db.users.find = MagicMock(return_value=cursor_mock)

    resp = await async_client_manager.get("/api/gala/v1/admin/registrations")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_registrations_manager_without_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(
        return_value={**MANAGER_DOC, "permissions": ["buses"]}
    )

    resp = await async_client_manager.get("/api/gala/v1/admin/registrations")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_export_registrations_manager_with_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(return_value=MANAGER_DOC)
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[])
    test_db.users.find = MagicMock(return_value=cursor_mock)

    resp = await async_client_manager.get("/api/gala/v1/admin/export/registrations")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_export_registrations_manager_without_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(
        return_value={**MANAGER_DOC, "permissions": ["tables"]}
    )

    resp = await async_client_manager.get("/api/gala/v1/admin/export/registrations")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_bus_assign_manager_with_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(
        return_value={**MANAGER_DOC, "permissions": ["buses"]}
    )
    update_result = MagicMock()
    update_result.matched_count = 0
    test_db.users.update_one = AsyncMock(return_value=update_result)

    resp = await async_client_manager.patch(
        "/api/gala/v1/admin/registrations/1/bus",
        json={"bus_id": "BUS_A"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bus_assign_manager_without_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(
        return_value={**MANAGER_DOC, "permissions": ["registration"]}
    )

    resp = await async_client_manager.patch(
        "/api/gala/v1/admin/registrations/1/bus",
        json={"bus_id": "BUS_A"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_config_access_manager_with_homepage_permission(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(
        return_value={**MANAGER_DOC, "permissions": ["homepage"]}
    )
    test_db.global_config.find_one = AsyncMock(return_value=None)

    resp = await async_client_manager.get("/api/gala/v1/admin/config")
    assert resp.status_code in [200, 404, 500]


@pytest.mark.asyncio
async def test_config_access_manager_without_config_permissions(async_client_manager: AsyncClient, test_db):
    test_db.manager_permissions.find_one = AsyncMock(
        return_value={**MANAGER_DOC, "permissions": ["buses"]}
    )

    resp = await async_client_manager.get("/api/gala/v1/admin/config")
    assert resp.status_code == 403