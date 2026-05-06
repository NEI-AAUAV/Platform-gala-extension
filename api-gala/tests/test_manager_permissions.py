import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient


MANAGER_DOC = {
    "_id": 42,
    "name": "Manager Gala",
    "email": "manager@ua.pt",
    "permissions": ["registration", "tables"],
}

AUTHENTIK_USER = {
    "pk": 42,
    "name": "Manager Gala",
    "email": "manager@ua.pt",
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
async def test_list_managers_uses_authentik(async_client_admin: AsyncClient, test_db):
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[MANAGER_DOC])
    test_db.manager_permissions.find = MagicMock(return_value=cursor_mock)

    with patch("app.services.manager_permissions.fetch_group_members", new=AsyncMock(return_value=[])):
        resp = await async_client_admin.get("/api/gala/v1/admin/managers")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["email"] == "manager@ua.pt"
    assert set(data[0]["permissions"]) == {"registration", "tables"}


@pytest.mark.asyncio
async def test_list_managers_includes_authentik_user_not_in_db(async_client_admin: AsyncClient, test_db):
    from app.services.authentik_service import AuthentikUser

    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[])
    test_db.manager_permissions.find = MagicMock(return_value=cursor_mock)

    authentik_user = AuthentikUser(pk=99, name="New Manager", email="new@ua.pt")

    with patch("app.services.manager_permissions.fetch_group_members", new=AsyncMock(return_value=[authentik_user])):
        resp = await async_client_admin.get("/api/gala/v1/admin/managers")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["_id"] == 99
    assert data[0]["name"] == "New Manager"
    assert data[0]["permissions"] == []


@pytest.mark.asyncio
async def test_list_managers_merges_authentik_with_db(async_client_admin: AsyncClient, test_db):
    from app.services.authentik_service import AuthentikUser

    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[MANAGER_DOC])
    test_db.manager_permissions.find = MagicMock(return_value=cursor_mock)

    authentik_user = AuthentikUser(pk=42, name="Manager Gala", email="manager@ua.pt")

    with patch("app.services.manager_permissions.fetch_group_members", new=AsyncMock(return_value=[authentik_user])):
        resp = await async_client_admin.get("/api/gala/v1/admin/managers")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
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
    test_db.manager_permissions.find_one = AsyncMock(return_value=updated_doc)
    test_db.manager_permissions.update_one = AsyncMock()

    resp = await async_client_admin.put(
        "/api/gala/v1/admin/managers/42/permissions",
        json={"permissions": ["buses"], "name": "Manager Gala", "email": "manager@ua.pt"},
    )
    assert resp.status_code == 200
    assert resp.json()["permissions"] == ["buses"]


@pytest.mark.asyncio
async def test_set_permissions_upserts_new_manager(async_client_admin: AsyncClient, test_db):
    new_doc = {"_id": 99, "name": "New Manager", "email": "new@ua.pt", "permissions": ["tables"]}
    test_db.manager_permissions.find_one = AsyncMock(return_value=new_doc)
    test_db.manager_permissions.update_one = AsyncMock()

    resp = await async_client_admin.put(
        "/api/gala/v1/admin/managers/99/permissions",
        json={"permissions": ["tables"], "name": "New Manager", "email": "new@ua.pt"},
    )
    assert resp.status_code == 200
    assert resp.json()["_id"] == 99
    assert resp.json()["permissions"] == ["tables"]
    test_db.manager_permissions.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_set_permissions_invalid_permission(async_client_admin: AsyncClient):
    resp = await async_client_admin.put(
        "/api/gala/v1/admin/managers/42/permissions",
        json={"permissions": ["nonexistent_feature"], "name": "x", "email": "x@x.pt"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_set_permissions_forbidden_for_manager(async_client_manager: AsyncClient):
    resp = await async_client_manager.put(
        "/api/gala/v1/admin/managers/1/permissions",
        json={"permissions": ["registration"], "name": "x", "email": "x@x.pt"},
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
