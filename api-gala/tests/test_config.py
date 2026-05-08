import pytest
from httpx import AsyncClient

@pytest.fixture
def mock_global_config_data():
    return {
        "_id": "GLOBAL_CONFIG",
        "dates": {},
        "prices": {"total_price": 35.0, "phased_payment_enabled": False},
        "bus": {"enabled": True},
        "homepage": {"dj": {"name": "Test DJ"}}
    }

@pytest.mark.asyncio
async def test_get_config(async_client: AsyncClient, test_db, mock_global_config_data):
    # Setup mock
    test_db.config.find_one.return_value = mock_global_config_data

    resp = await async_client.get("/api/gala/v1/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "prices" in data
    assert data["homepage"]["dj"]["name"] == "Test DJ"

@pytest.mark.asyncio
async def test_update_config_unauthorized(async_client: AsyncClient):
    resp = await async_client.put("/api/gala/v1/admin/config", json={"prices": {"total_price": 50.0}})
    assert resp.status_code in [401, 403, 404]
