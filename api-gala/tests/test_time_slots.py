import pytest
from httpx import AsyncClient
from app.models.time_slots import TimeSlots
import datetime

@pytest.fixture
def mock_time_slots_data():
    return {
        "registrationStart": "2020-01-01T00:00:00Z",
        "registrationEnd": "2030-01-01T00:00:00Z",
        "nominationsStart": "2020-01-01T00:00:00Z",
        "nominationsEnd": "2030-01-01T00:00:00Z",
        "votesStart": "2020-01-01T00:00:00Z",
        "votesEnd": "2030-01-01T00:00:00Z",
        "tablesStart": "2020-01-01T00:00:00Z",
        "tablesEnd": "2030-01-01T00:00:00Z",
        "galaStart": "2030-12-31T00:00:00Z"
    }

@pytest.mark.asyncio
async def test_get_time_slots(async_client: AsyncClient, test_db, mock_time_slots_data):
    test_db.time_slots.find_one.return_value = mock_time_slots_data

    resp = await async_client.get("/api/gala/v1/time_slots/")

    assert resp.status_code == 200
    data = resp.json()
    assert "registrationStart" in data
    assert "galaStart" in data

@pytest.mark.asyncio
async def test_update_time_slots_unauthorized(async_client: AsyncClient, test_db, mock_time_slots_data):
    # async_client has default scope — not manager-gala or admin
    # require_feature checks this explicitly and returns 403
    test_db.manager_permissions.find_one.return_value = None
    test_db.time_slots.find_one.return_value = mock_time_slots_data

    resp = await async_client.patch("/api/gala/v1/admin/time", json={"galaStart": "2040-01-01T00:00:00Z"})
    assert resp.status_code == 403
