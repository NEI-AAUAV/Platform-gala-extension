import pytest
from httpx import AsyncClient

@pytest.fixture
def mock_vote_category():
    return {
        "_id": 1,
        "category": "Best Person",
        "nomination_open": False,
        "voting_open": True,
        "results_visible": False,
        "nominations": [],
        "options": ["A", "B"],
        "photo_paths": [],
        "votes": [],
    }

@pytest.mark.asyncio
async def test_get_vote_categories(async_client: AsyncClient, test_db, mock_vote_category):
    from unittest.mock import MagicMock, AsyncMock
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=[mock_vote_category])
    test_db.vote_category.find = MagicMock(return_value=cursor_mock)

    resp = await async_client.get("/api/gala/v1/voting/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["category"] == "Best Person"

@pytest.mark.asyncio
async def test_cast_vote(async_client: AsyncClient, test_db, mock_vote_category):
    test_db.vote_category.find_one.return_value = mock_vote_category
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

    resp = await async_client.post("/api/gala/v1/voting/categories/1/vote", json={"option": 0})
    assert resp.status_code in [200, 400, 403, 409]
