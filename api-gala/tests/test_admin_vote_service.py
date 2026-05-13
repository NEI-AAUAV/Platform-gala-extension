"""Unit tests for AdminVoteService - merge_nominees and finalize_nominations."""
import pytest
from unittest.mock import AsyncMock, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _nominee(name, votes):
    return {"name": name, "votes": votes}


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


@pytest.mark.asyncio
async def test_finalize_nominations_returns_false_when_category_missing():
    from app.services.admin_vote import AdminVoteService

    db, coll = _make_db(finds=(None,))

    result = await AdminVoteService.finalize_nominations(db, 99)

    assert result is False
    coll.update_one.assert_not_called()
