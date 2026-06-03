import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone

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


def test_is_voting_open_uses_category_specific_window(monkeypatch):
    from app.api.vote import _utils
    from app.models.time_slots import TimeSlots
    from app.models.vote import VoteCategory

    now = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(_utils, "_now", lambda: now)

    ts = TimeSlots(
        _id="TIME_SLOTS",
        registrationStart=now - timedelta(days=1),
        registrationEnd=now + timedelta(days=1),
        nominationsStart=now - timedelta(days=1),
        nominationsEnd=now + timedelta(days=1),
        votesStart=now + timedelta(days=1),
        votesEnd=now + timedelta(days=2),
        tablesStart=now - timedelta(days=1),
        tablesEnd=now + timedelta(days=1),
        galaStart=now + timedelta(days=30),
    )
    category = VoteCategory(
        _id=1,
        category="Desempate",
        options=["A", "B"],
        votes_start=now - timedelta(hours=1),
        votes_end=now + timedelta(hours=1),
    )

    assert _utils.is_voting_open(ts, category) is True
    assert _utils.is_voting_open(ts) is False


def test_anonymize_category_ignores_invalid_stored_vote_options():
    from app.api.auth import AuthData
    from app.api.vote._utils import anonymize_category
    from app.models.time_slots import TimeSlots
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    ts = TimeSlots(
        _id="TIME_SLOTS",
        registrationStart=now - timedelta(days=1),
        registrationEnd=now + timedelta(days=1),
        nominationsStart=now - timedelta(days=1),
        nominationsEnd=now + timedelta(days=1),
        votesStart=now - timedelta(days=1),
        votesEnd=now + timedelta(days=1),
        tablesStart=now - timedelta(days=1),
        tablesEnd=now + timedelta(days=1),
        galaStart=now + timedelta(days=30),
    )
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B"],
        votes=[
            {"uid": 1, "option": 0},
            {"uid": 2, "option": 5},
            {"uid": 3, "option": -1},
        ],
        results_visible=True,
    )
    auth = AuthData(
        sub=1,
        nmec=None,
        name="Alice",
        email="alice@example.com",
        surname="Example",
        scopes=[],
    )

    listing = anonymize_category(category, auth, ts, results_visible=True)

    assert listing.scores == [1, 0]


def test_anonymize_category_hides_scores_with_hidden_options():
    from app.api.auth import AuthData
    from app.api.vote._utils import anonymize_category
    from app.models.time_slots import TimeSlots
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    ts = TimeSlots(
        _id="TIME_SLOTS",
        registrationStart=now - timedelta(days=1),
        registrationEnd=now + timedelta(days=1),
        nominationsStart=now - timedelta(days=1),
        nominationsEnd=now + timedelta(days=1),
        votesStart=now - timedelta(days=1),
        votesEnd=now + timedelta(days=1),
        tablesStart=now - timedelta(days=1),
        tablesEnd=now + timedelta(days=1),
        galaStart=now + timedelta(days=30),
    )
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B"],
        photo_paths=["/a.jpg"],
        votes=[{"uid": 1, "option": 0}],
        is_hidden=True,
        results_visible=True,
    )
    auth = AuthData(
        sub=1,
        nmec=None,
        name="Alice",
        email="alice@example.com",
        surname="Example",
        scopes=[],
    )

    listing = anonymize_category(category, auth, ts, results_visible=True)

    assert listing.revealed is False
    assert listing.options == []
    assert listing.photo_paths == []
    assert listing.scores == []


def test_anonymize_category_pads_photo_paths_to_option_count():
    from app.api.auth import AuthData
    from app.api.vote._utils import anonymize_category
    from app.models.time_slots import TimeSlots
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    ts = TimeSlots(
        _id="TIME_SLOTS",
        registrationStart=now - timedelta(days=1),
        registrationEnd=now + timedelta(days=1),
        nominationsStart=now - timedelta(days=1),
        nominationsEnd=now + timedelta(days=1),
        votesStart=now - timedelta(days=1),
        votesEnd=now + timedelta(days=1),
        tablesStart=now - timedelta(days=1),
        tablesEnd=now + timedelta(days=1),
        galaStart=now + timedelta(days=30),
    )
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B", "C"],
        photo_paths=["/a.jpg"],
    )
    auth = AuthData(
        sub=1,
        nmec=None,
        name="Alice",
        email="alice@example.com",
        surname="Example",
        scopes=[],
    )

    listing = anonymize_category(category, auth, ts, results_visible=False)

    assert listing.options == ["A", "B", "C"]
    assert listing.photo_paths == ["/a.jpg", "", ""]
    assert listing.scores == [0, 0, 0]
