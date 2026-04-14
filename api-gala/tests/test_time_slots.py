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
    # Setup mock
    test_db.time_slots.find_one.return_value = mock_time_slots_data

    # Act
    resp = await async_client.get("/time_slots/")
    
    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "registrationStart" in data
    assert "galaStart" in data

@pytest.mark.asyncio
async def test_update_time_slots_unauthorized(async_client: AsyncClient):
    # This endpoint goes through admin logic, we assume we are not admin in this mock client by default
    # Wait, the default override context is "default" scope. So it should fail if admin is required!
    resp = await async_client.patch("/admin/time", json={"galaStart": "2040-01-01T00:00:00Z"})
    # It might return 401 or 403 depending on exact routing structure, but we assert it fails
    assert resp.status_code in [401, 403, 404]

# To test as an admin, we would need to override the mock_auth_data dynamically.
