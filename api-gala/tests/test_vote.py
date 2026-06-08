import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock


def active_time_slot_payload():
    return {
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


def make_time_slots(now, nominations_start=None, nominations_end=None, votes_start=None, votes_end=None):
    from app.models.time_slots import TimeSlots

    return TimeSlots(
        _id="TIME_SLOTS",
        registrationStart=now - timedelta(days=1),
        registrationEnd=now + timedelta(days=1),
        nominationsStart=nominations_start if nominations_start is not None else now - timedelta(days=1),
        nominationsEnd=nominations_end if nominations_end is not None else now + timedelta(days=1),
        votesStart=votes_start if votes_start is not None else now - timedelta(days=1),
        votesEnd=votes_end if votes_end is not None else now + timedelta(days=1),
        tablesStart=now - timedelta(days=1),
        tablesEnd=now + timedelta(days=1),
        galaStart=now + timedelta(days=30),
    )


def mock_db_find_result(test_db, results):
    from unittest.mock import MagicMock, AsyncMock
    cursor_mock = MagicMock()
    cursor_mock.to_list = AsyncMock(return_value=results)
    test_db.vote_category.find = MagicMock(return_value=cursor_mock)


def make_auth():
    from app.api.auth import AuthData

    return AuthData(
        sub=1,
        nmec=None,
        name="Alice",
        email="alice@example.com",
        surname="Example",
        scopes=[],
    )


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
    mock_db_find_result(test_db, [mock_vote_category])

    resp = await async_client.get("/api/gala/v1/voting/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["category"] == "Best Person"


@pytest.mark.asyncio
async def test_list_vote_categories_excludes_hidden_and_unrevealed(
    async_client: AsyncClient, test_db, mock_vote_category
):
    mock_db_find_result(
        test_db,
        [
            mock_vote_category,
            {**mock_vote_category, "_id": 2, "category": "Hidden", "is_hidden": True},
            {
                **mock_vote_category,
                "_id": 3,
                "category": "Future",
                "reveal_at": "2030-01-01T00:00:00Z",
            },
        ],
    )

    resp = await async_client.get("/api/gala/v1/voting/categories")

    assert resp.status_code == 200
    assert [category["category"] for category in resp.json()] == ["Best Person"]


@pytest.mark.asyncio
async def test_list_public_vote_categories_does_not_require_auth(
    async_client: AsyncClient, test_db, mock_vote_category
):
    mock_db_find_result(
        test_db,
        [
            mock_vote_category,
            {**mock_vote_category, "_id": 2, "category": "Hidden", "is_hidden": True},
        ],
    )

    resp = await async_client.get("/api/gala/v1/voting/categories/public")

    assert resp.status_code == 200
    assert [category["category"] for category in resp.json()] == ["Best Person"]


@pytest.mark.asyncio
async def test_cast_vote_succeeds(async_client: AsyncClient, test_db, mock_vote_category):
    update_result = MagicMock()
    update_result.modified_count = 1
    test_db.user.find_one.return_value = _REGISTERED_USER
    test_db.vote_category.find_one.return_value = mock_vote_category
    test_db.vote_category.update_one.return_value = update_result
    test_db.time_slots.find_one.return_value = active_time_slot_payload()

    resp = await async_client.post("/api/gala/v1/voting/categories/1/vote", json={"option": 0})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_cast_vote_closed_voting_window_returns_403(
    async_client: AsyncClient, test_db, mock_vote_category
):
    test_db.user.find_one.return_value = _REGISTERED_USER
    test_db.vote_category.find_one.return_value = mock_vote_category
    closed_ts = {**active_time_slot_payload(), "votesEnd": "2020-01-02T00:00:00Z"}
    test_db.time_slots.find_one.return_value = closed_ts

    resp = await async_client.post("/api/gala/v1/voting/categories/1/vote", json={"option": 0})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_hidden_vote_category_returns_404(
    async_client: AsyncClient, test_db, mock_vote_category
):
    test_db.vote_category.find_one.return_value = {
        **mock_vote_category,
        "is_hidden": True,
    }
    test_db.time_slots.find_one.return_value = active_time_slot_payload()

    resp = await async_client.get("/api/gala/v1/voting/categories/1")

    assert resp.status_code == 404


def test_is_voting_open_uses_category_specific_window(monkeypatch):
    from app.api.vote import _utils
    from app.models.vote import VoteCategory

    now = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(_utils, "_now", lambda: now)

    ts = make_time_slots(
        now,
        votes_start=now + timedelta(days=1),
        votes_end=now + timedelta(days=2),
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


def test_cast_vote_window_allows_category_specific_window_when_global_closed(monkeypatch):
    from app.api.vote import vote as vote_api
    from app.models.vote import VoteCategory

    now = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr("app.api.vote._utils._now", lambda: now)

    ts = make_time_slots(
        now,
        nominations_start=now - timedelta(days=2),
        nominations_end=now - timedelta(days=1),
        votes_start=now - timedelta(days=2),
        votes_end=now - timedelta(days=1),
    )
    category = VoteCategory(
        _id=1,
        category="Desempate",
        options=["A", "B"],
        votes_start=now - timedelta(hours=1),
        votes_end=now + timedelta(hours=1),
    )

    assert vote_api._is_category_vote_open(ts, category) is True


def test_cast_vote_window_falls_back_to_global_window(monkeypatch):
    from app.api.vote import vote as vote_api
    from app.models.vote import VoteCategory

    now = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr("app.api.vote._utils._now", lambda: now)

    ts = make_time_slots(
        now,
        nominations_start=now - timedelta(days=2),
        nominations_end=now - timedelta(days=1),
        votes_start=now - timedelta(hours=1),
        votes_end=now + timedelta(hours=1),
    )
    category = VoteCategory(_id=1, category="Regular", options=["A", "B"])

    assert vote_api._is_category_vote_open(ts, category) is True


def test_anonymize_category_ignores_invalid_stored_vote_options():
    from app.api.vote._utils import anonymize_category
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
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

    listing = anonymize_category(
        category, make_auth(), make_time_slots(now), results_visible=True
    )

    assert listing.scores == [1, 0]


def test_anonymize_category_hides_scores_with_hidden_options():
    from app.api.vote._utils import anonymize_category
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B"],
        photo_paths=["/a.jpg"],
        votes=[{"uid": 1, "option": 0}],
        is_hidden=True,
        results_visible=True,
    )

    listing = anonymize_category(
        category, make_auth(), make_time_slots(now), results_visible=True
    )

    assert listing.revealed is False
    assert listing.options == []
    assert listing.photo_paths == []
    assert listing.scores == []


def test_anonymize_category_shows_scores_when_category_results_visible():
    from app.api.vote._utils import anonymize_category
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B"],
        votes=[{"uid": 1, "option": 0}],
        results_visible=True,
    )

    listing = anonymize_category(
        category, make_auth(), make_time_slots(now), results_visible=False
    )

    assert listing.results_visible is True
    assert listing.scores == [1, 0]


def test_anonymize_category_pads_photo_paths_to_option_count():
    from app.api.vote._utils import anonymize_category
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B", "C"],
        photo_paths=["/a.jpg"],
    )

    listing = anonymize_category(
        category, make_auth(), make_time_slots(now), results_visible=False
    )

    assert listing.options == ["A", "B", "C"]
    assert listing.photo_paths == ["/a.jpg", "", ""]
    assert listing.scores == [0, 0, 0]


def test_anonymize_category_closes_nominations_when_options_exist():
    from app.api.vote._utils import anonymize_category
    from app.models.vote import VoteCategory

    now = datetime.now(timezone.utc)
    category = VoteCategory(
        _id=1,
        category="Best Person",
        options=["A", "B"],
    )

    listing = anonymize_category(category, make_auth(), make_time_slots(now))

    assert listing.nomination_open is False


_REGISTERED_USER = {
    "_id": 1,
    "nmec": 12345,
    "email": "test@example.com",
    "name": "Test User",
    "is_registered": True,
    "registration_active": True,
}


@pytest.mark.asyncio
async def test_cast_vote_on_hidden_category_returns_404(
    async_client: AsyncClient, test_db, mock_vote_category
):
    test_db.user.find_one.return_value = _REGISTERED_USER
    test_db.vote_category.find_one.return_value = {**mock_vote_category, "is_hidden": True}
    test_db.time_slots.find_one.return_value = active_time_slot_payload()

    resp = await async_client.post(
        "/api/gala/v1/voting/categories/1/vote", json={"option": 0}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cast_vote_on_unrevealed_category_returns_404(
    async_client: AsyncClient, test_db, mock_vote_category
):
    test_db.user.find_one.return_value = _REGISTERED_USER
    future_reveal = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    test_db.vote_category.find_one.return_value = {
        **mock_vote_category, "reveal_at": future_reveal
    }
    test_db.time_slots.find_one.return_value = active_time_slot_payload()

    resp = await async_client.post(
        "/api/gala/v1/voting/categories/1/vote", json={"option": 0}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_nominate_all_fail_returns_400(
    async_client: AsyncClient, test_db
):
    test_db.user.find_one.return_value = _REGISTERED_USER
    test_db.vote_category.find_one.return_value = None  # both categories missing → ValueError
    test_db.time_slots.find_one.return_value = active_time_slot_payload()

    resp = await async_client.post(
        "/api/gala/v1/voting/bulk_nominate",
        json={"items": [
            {"category_id": 99, "names": ["Alice"]},
            {"category_id": 100, "names": ["Bob"]},
        ]},
    )
    assert resp.status_code == 400
    body = resp.json()
    assert "errors" in body["detail"]
    assert len(body["detail"]["errors"]) == 2


@pytest.mark.asyncio
async def test_admin_finalize_non_admin_returns_403(async_client: AsyncClient, test_db):
    resp = await async_client.post(
        "/api/gala/v1/admin/voting/categories/1/finalize"
    )
    assert resp.status_code == 403


def test_reveal_at_boundary_is_revealed(monkeypatch):
    from app.api.vote import _utils
    from app.models.vote import VoteCategory

    now = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(_utils, "_now", lambda: now)

    category = VoteCategory(_id=1, category="Test", reveal_at=now)
    assert _utils._is_category_revealed(category) is True


@pytest.mark.asyncio
async def test_nominate_closed_window_returns_403(
    async_client: AsyncClient, test_db, mock_vote_category
):
    test_db.user.find_one.return_value = _REGISTERED_USER
    test_db.vote_category.find_one.return_value = mock_vote_category
    closed_ts = {**active_time_slot_payload(), "nominationsEnd": "2020-01-02T00:00:00Z"}
    test_db.time_slots.find_one.return_value = closed_ts

    resp = await async_client.post(
        "/api/gala/v1/voting/categories/1/nominate",
        json={"names": ["Alice"]},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_nominate_name_too_long_returns_422(
    async_client: AsyncClient, test_db
):
    test_db.user.find_one.return_value = _REGISTERED_USER
    resp = await async_client.post(
        "/api/gala/v1/voting/categories/1/nominate",
        json={"names": ["A" * 201]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_suggestions_cross_category_query_excludes_hidden(monkeypatch):
    from app.services.vote import VoteService
    from unittest.mock import AsyncMock, MagicMock

    now_val = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)

    category_mock = MagicMock()
    category_mock.id = 1

    captured_filters = []

    def make_cursor(results):
        cursor = MagicMock()
        cursor.to_list = AsyncMock(return_value=results)
        return cursor

    db = MagicMock()
    user_coll = MagicMock()
    vote_coll = MagicMock()

    user_coll.find = MagicMock(return_value=make_cursor([]))
    vote_coll.find_one = AsyncMock(return_value={"_id": 1, "category": "Test", "is_hidden": False})

    def vote_find(filter_, **_):
        captured_filters.append(filter_)
        return make_cursor([])

    vote_coll.find = MagicMock(side_effect=vote_find)
    db.__getitem__ = MagicMock(side_effect=lambda key: vote_coll if key == "vote_category" else user_coll)

    monkeypatch.setattr("app.services.vote.datetime", MagicMock(now=MagicMock(return_value=now_val)))

    await VoteService.get_suggestions(db, 1, "Alice")

    categories_filter = next(f for f in captured_filters if "nominations.name" in str(f))
    assert categories_filter.get("is_hidden") == {"$ne": True}
    assert "$or" in categories_filter


