"""Unit tests for AdminVoteService - merge_nominees and finalize_nominations."""
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _nominee(name, votes):
    return {"name": name, "votes": votes}


def _vote(uid, option):
    return {"uid": uid, "option": option}


def _category_doc(**kwargs):
    base = {
        "_id": 1,
        "category": "Melhor Cantor",
        "nomination_open": True,
        "voting_open": False,
        "results_visible": False,
        "nominations": [],
        "options": [],
        "photo_paths": [],
        "votes": [],
    }
    base.update(kwargs)
    return base


def _make_db(finds=()):
    coll = AsyncMock()
    if len(finds) == 1:
        coll.find_one.return_value = finds[0]
    elif len(finds) > 1:
        coll.find_one.side_effect = list(finds)
    coll.update_one.return_value = MagicMock()
    coll.insert_one.return_value = MagicMock()
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=coll)
    return db, coll


# ---------------------------------------------------------------------------
# merge_nominees
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_merge_nominees_combines_votes_from_sources():
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2]),
        _nominee("Alicia", [3]),
        _nominee("Bob", [4, 5]),
    ]
    doc = _category_doc(nominations=nominations)
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.merge_nominees(db, 1, "Alice", ["Alicia"])

    assert result is True
    coll.update_one.assert_called_once()
    saved = coll.update_one.call_args[0][1]["$set"]["nominations"]
    alice = next(n for n in saved if n["name"] == "Alice")
    assert set(alice["votes"]) == {1, 2, 3}
    assert not any(n["name"] == "Alicia" for n in saved)
    assert any(n["name"] == "Bob" for n in saved)


@pytest.mark.asyncio
async def test_merge_nominees_creates_target_when_missing():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(nominations=[_nominee("Alicia", [3, 4])])
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.merge_nominees(db, 1, "Alice", ["Alicia"])

    assert result is True
    saved = coll.update_one.call_args[0][1]["$set"]["nominations"]
    alice = next(n for n in saved if n["name"] == "Alice")
    assert set(alice["votes"]) == {3, 4}
    assert not any(n["name"] == "Alicia" for n in saved)


@pytest.mark.asyncio
async def test_merge_nominees_deduplicates_voters():
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2]),
        _nominee("Alicia", [2, 3]),  # voter 2 appears in both
    ]
    doc = _category_doc(nominations=nominations)
    db, coll = _make_db(finds=(doc,))

    await AdminVoteService.merge_nominees(db, 1, "Alice", ["Alicia"])

    saved = coll.update_one.call_args[0][1]["$set"]["nominations"]
    alice = next(n for n in saved if n["name"] == "Alice")
    assert set(alice["votes"]) == {1, 2, 3}
    assert len(alice["votes"]) == 3


@pytest.mark.asyncio
async def test_merge_nominees_returns_false_when_category_missing():
    from app.services.admin_vote import AdminVoteService

    db, coll = _make_db(finds=(None,))

    result = await AdminVoteService.merge_nominees(db, 99, "Alice", ["Alicia"])

    assert result is False
    coll.update_one.assert_not_called()


# ---------------------------------------------------------------------------
# finalize_nominations
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_finalize_nominations_selects_top_4_by_vote_count():
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2, 3]),
        _nominee("Bob", [4, 5]),
        _nominee("Carol", [6, 7, 8, 9]),
        _nominee("Dave", [10]),
        _nominee("Eve", [11, 12]),
    ]
    doc = _category_doc(nominations=nominations)
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.finalize_nominations(db, 1)

    assert result is True
    coll.update_one.assert_called_once()
    update = coll.update_one.call_args[0][1]["$set"]
    assert len(update["options"]) == 4
    assert "Carol" in update["options"]
    assert "Alice" in update["options"]
    assert "Dave" not in update["options"]


@pytest.mark.asyncio
async def test_finalize_nominations_takes_all_when_fewer_than_4():
    from app.services.admin_vote import AdminVoteService

    nominations = [_nominee("Alice", [1]), _nominee("Bob", [2, 3])]
    doc = _category_doc(nominations=nominations)
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.finalize_nominations(db, 1)

    assert result is True
    update = coll.update_one.call_args[0][1]["$set"]
    assert set(update["options"]) == {"Alice", "Bob"}
    assert update["photo_paths"] == ["", ""]


@pytest.mark.asyncio
async def test_finalize_nominations_accepts_admin_selected_names():
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2, 3]),
        _nominee("Bob", [4, 5]),
        _nominee("Carol", [6, 7]),
        _nominee("Dave", [8, 9]),
        _nominee("Eve", [10, 11]),
    ]
    doc = _category_doc(nominations=nominations)
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.finalize_nominations(
        db,
        1,
        selected_names=["Alice", "Bob", "Dave", "Eve"],
    )

    assert result is True
    update = coll.update_one.call_args[0][1]["$set"]
    assert update["options"] == ["Alice", "Bob", "Dave", "Eve"]
    assert update["photo_paths"] == ["", "", "", ""]


@pytest.mark.asyncio
async def test_finalize_nominations_preserves_existing_photos_by_option_name():
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2, 3]),
        _nominee("Bob", [4, 5]),
        _nominee("Carol", [6, 7]),
    ]
    doc = _category_doc(
        nominations=nominations,
        options=["Carol", "Alice", "Mallory"],
        photo_paths=["carol.jpg", "alice.jpg", "mallory.jpg"],
    )
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.finalize_nominations(
        db,
        1,
        selected_names=["Alice", "Bob", "Carol"],
    )

    assert result is True
    update = coll.update_one.call_args[0][1]["$set"]
    assert update["options"] == ["Alice", "Bob", "Carol"]
    assert update["photo_paths"] == ["alice.jpg", "", "carol.jpg"]


@pytest.mark.asyncio
async def test_finalize_nominations_rejects_option_changes_after_votes():
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2, 3]),
        _nominee("Bob", [4, 5]),
        _nominee("Carol", [6, 7]),
    ]
    doc = _category_doc(
        nominations=nominations,
        options=["Alice", "Bob"],
        votes=[_vote(1, 0)],
    )
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.finalize_nominations(
        db,
        1,
        selected_names=["Bob", "Alice"],
    )

    assert result is False
    coll.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_finalize_nominations_rejects_unknown_selected_names():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(nominations=[_nominee("Alice", [1])])
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.finalize_nominations(
        db,
        1,
        selected_names=["Alice", "Mallory"],
    )

    assert result is False
    coll.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_finalize_nominations_returns_false_when_category_missing():
    from app.services.admin_vote import AdminVoteService

    db, coll = _make_db(finds=(None,))

    result = await AdminVoteService.finalize_nominations(db, 99)

    assert result is False
    coll.update_one.assert_not_called()


# ---------------------------------------------------------------------------
# create_runoff_category
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_runoff_category_for_three_tied_nominees_two_slots(monkeypatch):
    from app.services import admin_vote
    from app.services.admin_vote import AdminVoteService

    nominations = [
        _nominee("Alice", [1, 2, 3]),
        _nominee("Bob", [4, 5, 6]),
        _nominee("Carol", [7, 8]),
        _nominee("Dave", [9, 10]),
        _nominee("Eve", [11, 12]),
    ]
    doc = _category_doc(category="Melhor Traje", nominations=nominations)
    db, coll = _make_db(finds=(doc,))
    monkeypatch.setattr(admin_vote, "get_next_vote_category_id", AsyncMock(return_value=42))

    result = await AdminVoteService.create_runoff_category(
        db,
        1,
        nominee_names=["Carol", "Dave", "Eve"],
        slots=2,
        votes_start=datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc),
        votes_end=datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc),
    )

    assert result is not None
    assert result.id == 42
    assert result.category == "Desempate - Melhor Traje"
    assert result.options == ["Carol", "Dave", "Eve"]
    assert result.photo_paths == ["", "", ""]
    assert result.votes_start == datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    assert result.votes_end == datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc)
    coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_create_runoff_category_all_nominees_tied_for_four_slots(monkeypatch):
    from app.services import admin_vote
    from app.services.admin_vote import AdminVoteService

    tied_names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank"]
    doc = _category_doc(
        category="Melhor Grupo",
        nominations=[_nominee(name, [index]) for index, name in enumerate(tied_names, start=1)],
    )
    db, coll = _make_db(finds=(doc,))
    monkeypatch.setattr(admin_vote, "get_next_vote_category_id", AsyncMock(return_value=44))

    result = await AdminVoteService.create_runoff_category(
        db,
        1,
        nominee_names=tied_names,
        slots=4,
    )

    assert result is not None
    assert result.options == tied_names
    assert result.description == "2.ª volta para escolher 4 de 6 nomeados empatados."
    coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_create_runoff_category_rejects_unknown_nominee():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(nominations=[_nominee("Alice", [1]), _nominee("Bob", [2])])
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.create_runoff_category(
        db,
        1,
        nominee_names=["Alice", "Mallory"],
        slots=1,
    )

    assert result is None
    coll.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_create_runoff_category_rejects_invalid_slot_count():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(nominations=[_nominee("Alice", [1]), _nominee("Bob", [2])])
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.create_runoff_category(
        db,
        1,
        nominee_names=["Alice", "Bob"],
        slots=2,
    )

    assert result is None
    coll.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_create_runoff_category_rejects_invalid_vote_window():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(nominations=[_nominee("Alice", [1]), _nominee("Bob", [2])])
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.create_runoff_category(
        db,
        1,
        nominee_names=["Alice", "Bob"],
        slots=1,
        votes_start=datetime(2026, 6, 12, 12, 0, tzinfo=timezone.utc),
        votes_end=datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc),
    )

    assert result is None
    coll.insert_one.assert_not_called()


# ---------------------------------------------------------------------------
# create_vote_runoff_category
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_vote_runoff_category_for_tied_winners(monkeypatch):
    from app.services import admin_vote
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(
        category="Melhor Momento",
        options=["Alice", "Bob", "Carol"],
        photo_paths=["alice.jpg", "bob.jpg", "carol.jpg"],
        votes=[
            _vote(1, 0),
            _vote(2, 0),
            _vote(3, 1),
            _vote(4, 1),
            _vote(5, 2),
        ],
    )
    db, coll = _make_db(finds=(doc,))
    monkeypatch.setattr(admin_vote, "get_next_vote_category_id", AsyncMock(return_value=43))

    result = await AdminVoteService.create_vote_runoff_category(
        db,
        1,
        votes_start=datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc),
        votes_end=datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc),
    )

    assert result is not None
    assert result.id == 43
    assert result.category == "Desempate - Melhor Momento"
    assert result.options == ["Alice", "Bob"]
    assert result.photo_paths == ["alice.jpg", "bob.jpg"]
    assert result.votes_start == datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
    assert result.votes_end == datetime(2026, 6, 11, 12, 0, tzinfo=timezone.utc)
    coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_create_vote_runoff_category_keeps_all_tied_winners_and_ignores_invalid_votes(monkeypatch):
    from app.services import admin_vote
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(
        category="Melhor Final",
        options=["Alice", "Bob", "Carol"],
        photo_paths=["alice.jpg"],
        votes=[
            _vote(1, 0),
            _vote(2, 1),
            _vote(3, 2),
            _vote(4, 99),
        ],
    )
    db, coll = _make_db(finds=(doc,))
    monkeypatch.setattr(admin_vote, "get_next_vote_category_id", AsyncMock(return_value=45))

    result = await AdminVoteService.create_vote_runoff_category(db, 1)

    assert result is not None
    assert result.options == ["Alice", "Bob", "Carol"]
    assert result.photo_paths == ["alice.jpg", "", ""]
    coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_create_vote_runoff_category_rejects_clear_winner():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(
        options=["Alice", "Bob"],
        votes=[_vote(1, 0), _vote(2, 0), _vote(3, 1)],
    )
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.create_vote_runoff_category(db, 1)

    assert result is None
    coll.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_create_vote_runoff_category_rejects_zero_vote_tie():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(options=["Alice", "Bob", "Carol"], votes=[])
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.create_vote_runoff_category(db, 1)

    assert result is None
    coll.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_create_vote_runoff_category_rejects_partial_vote_window():
    from app.services.admin_vote import AdminVoteService

    doc = _category_doc(
        options=["Alice", "Bob"],
        votes=[_vote(1, 0), _vote(2, 1)],
    )
    db, coll = _make_db(finds=(doc,))

    result = await AdminVoteService.create_vote_runoff_category(
        db,
        1,
        votes_start=datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc),
    )

    assert result is None
    coll.insert_one.assert_not_called()
