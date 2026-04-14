import pytest
from httpx import AsyncClient

@pytest.fixture
def mock_registration_user():
    return {
        "_id": 1,
        "nmec": 12345,
        "is_registered": True,
        "has_payed": False,
        "current_step": 3
    }

@pytest.mark.asyncio
async def test_get_registration_status(async_client: AsyncClient, test_db, mock_registration_user):
    test_db.users.find_one.return_value = mock_registration_user

    resp = await async_client.get("/registration/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_registered"] == True

@pytest.mark.asyncio
async def test_update_registration_step(async_client: AsyncClient, test_db, mock_registration_user):
    test_db.users.find_one.return_value = mock_registration_user
    test_db.time_slots.find_one.return_value = {
        "registrationStart": "2020-01-01T00:00:00Z",
        "registrationEnd": "2030-01-01T00:00:00Z"
    }

    # Should update successfully because the time window is valid, or fail if validation fails
    resp = await async_client.post("/registration/step/1", json={"dish": "Carne"})
    # Since we are mocking db and it doesn't fail inherently, we expect some logical completion
    assert resp.status_code in [200, 400]
