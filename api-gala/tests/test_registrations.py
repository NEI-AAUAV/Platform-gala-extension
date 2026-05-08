import pytest
from httpx import AsyncClient

@pytest.fixture
def mock_registration_user():
    return {
        "_id": 1,
        "nmec": 12345,
        "name": "Test User",
        "email": "test@ua.pt",
        "is_registered": True,
        "has_payed": False,
        "registration_step": 3,
    }

@pytest.mark.asyncio
async def test_get_registration_status(async_client: AsyncClient, test_db, mock_registration_user):
    test_db.user.find_one.return_value = mock_registration_user

    resp = await async_client.get("/api/gala/v1/registration/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_registered"] == True

@pytest.mark.asyncio
async def test_update_registration_step(async_client: AsyncClient, test_db, mock_registration_user):
    test_db.user.find_one.return_value = mock_registration_user
    test_db.time_slots.find_one.return_value = {
        "registrationStart": "2020-01-01T00:00:00Z",
        "registrationEnd": "2030-01-01T00:00:00Z",
        "nominationsStart": "2020-01-01T00:00:00Z",
        "nominationsEnd": "2030-01-01T00:00:00Z",
        "votesStart": "2020-01-01T00:00:00Z",
        "votesEnd": "2030-01-01T00:00:00Z",
        "tablesStart": "2020-01-01T00:00:00Z",
        "tablesEnd": "2030-01-01T00:00:00Z",
        "galaStart": "2030-12-31T00:00:00Z",
    }

    resp = await async_client.post("/api/gala/v1/registration/step/1", json={"dish": "Carne"})
    assert resp.status_code in [200, 400]
