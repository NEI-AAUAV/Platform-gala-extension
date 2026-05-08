"""Unit tests for VoteService — covers atomicity fixes for vote and nomination."""
import pytest
from unittest.mock import AsyncMock, MagicMock


def _make_db(vote_category_doc=None):
    coll = AsyncMock()
    if vote_category_doc is not None:
        coll.find_one.return_value = vote_category_doc
    update_result = MagicMock()
    update_result.modified_count = 1
    coll.update_one.return_value = update_result
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=coll)
    return db, coll


# ---------------------------------------------------------------------------
# VoteService.vote
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_vote_success():
    from app.services.vote import VoteService

    category = {
        "_id": 1,
        "category": "Best",
        "options": ["Alice", "Bob"],
        "nominations": [],
        "votes": [],
        "voting_open": True,
        "nomination_open": False,
        "results_visible": False,
        "photo_paths": [],
    }
    db, coll = _make_db(category)
    result = await VoteService.vote(db, user_id=10, category_id=1, option_index=0)
    assert result is True
    coll.update_one.assert_called_once()
    filter_arg = coll.update_one.call_args[0][0]
    assert filter_arg["votes.uid"] == {"$ne": 10}


@pytest.mark.asyncio
async def test_vote_duplicate_prevented_atomically():
    """modified_count == 0 from the DB (race) raises ValueError."""
    from app.services.vote import VoteService

    category = {
        "_id": 1,
        "category": "Best",
        "options": ["Alice", "Bob"],
        "nominations": [],
        "votes": [{"uid": 10, "option": 0}],
        "voting_open": True,
        "nomination_open": False,
        "results_visible": False,
        "photo_paths": [],
    }
    db, coll = _make_db(category)
    no_op = MagicMock()
    no_op.modified_count = 0
    coll.update_one.return_value = no_op

    with pytest.raises(ValueError, match="already voted"):
        await VoteService.vote(db, user_id=10, category_id=1, option_index=1)


@pytest.mark.asyncio
async def test_vote_closed_category():
    from app.services.vote import VoteService

    category = {
        "_id": 1,
        "category": "Best",
        "options": ["Alice"],
        "nominations": [],
        "votes": [],
        "voting_open": False,
        "nomination_open": False,
        "results_visible": False,
        "photo_paths": [],
    }
    db, _ = _make_db(category)
    with pytest.raises(ValueError, match="closed"):
        await VoteService.vote(db, user_id=5, category_id=1, option_index=0)


@pytest.mark.asyncio
async def test_vote_invalid_option():
    from app.services.vote import VoteService

    category = {
        "_id": 1,
        "category": "Best",
        "options": ["Alice"],
        "nominations": [],
        "votes": [],
        "voting_open": True,
        "nomination_open": False,
        "results_visible": False,
        "photo_paths": [],
    }
    db, _ = _make_db(category)
    with pytest.raises(ValueError, match="Invalid option"):
        await VoteService.vote(db, user_id=5, category_id=1, option_index=5)


# ---------------------------------------------------------------------------
# VoteService.nominate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_nominate_new_entry():
    from app.services.vote import VoteService

    category = {
        "_id": 2,
        "category": "Funniest",
        "options": [],
        "nominations": [],
        "votes": [],
        "voting_open": False,
        "nomination_open": True,
        "results_visible": False,
        "photo_paths": [],
    }
    db, coll = _make_db(category)
    result = await VoteService.nominate(db, user_id=7, category_id=2, nominee_name="Carlos")
    assert result is True
    coll.update_one.assert_called_once()
    update_arg = coll.update_one.call_args[0][1]
    pushed = update_arg["$push"]["nominations"]
    assert pushed["name"] == "Carlos"
    assert 7 in pushed["votes"]


@pytest.mark.asyncio
async def test_nominate_adds_vote_to_existing_case_insensitive():
    """Adding a nomination with different casing hits the existing entry."""
    from app.services.vote import VoteService

    category = {
        "_id": 2,
        "category": "Funniest",
        "options": [],
        "nominations": [{"name": "Carlos", "votes": [3]}],
        "votes": [],
        "voting_open": False,
        "nomination_open": True,
        "results_visible": False,
        "photo_paths": [],
    }
    db, coll = _make_db(category)
    await VoteService.nominate(db, user_id=7, category_id=2, nominee_name="carlos")
    filter_arg = coll.update_one.call_args[0][0]
    update_arg = coll.update_one.call_args[0][1]
    # Should update the existing "Carlos" entry, not push a new nominations element
    assert filter_arg["nominations.name"] == "Carlos"
    assert "$push" in update_arg
    assert "nominations.$.votes" in update_arg["$push"]


@pytest.mark.asyncio
async def test_nominate_duplicate_prevented_by_preflight():
    """Pre-flight check stops the same user nominating again before reaching the DB."""
    from app.services.vote import VoteService

    category = {
        "_id": 2,
        "category": "Funniest",
        "options": [],
        "nominations": [{"name": "Carlos", "votes": [7]}],
        "votes": [],
        "voting_open": False,
        "nomination_open": True,
        "results_visible": False,
        "photo_paths": [],
    }
    db, coll = _make_db(category)
    with pytest.raises(ValueError, match="already nominated"):
        await VoteService.nominate(db, user_id=7, category_id=2, nominee_name="Ana")
    coll.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_nominate_duplicate_prevented_atomically():
    """modified_count == 0 from DB (race) raises ValueError."""
    from app.services.vote import VoteService

    category = {
        "_id": 2,
        "category": "Funniest",
        "options": [],
        "nominations": [],
        "votes": [],
        "voting_open": False,
        "nomination_open": True,
        "results_visible": False,
        "photo_paths": [],
    }
    db, coll = _make_db(category)
    no_op = MagicMock()
    no_op.modified_count = 0
    coll.update_one.return_value = no_op

    with pytest.raises(ValueError, match="already nominated"):
        await VoteService.nominate(db, user_id=7, category_id=2, nominee_name="Ana")


@pytest.mark.asyncio
async def test_nominate_closed():
    from app.services.vote import VoteService

    category = {
        "_id": 2,
        "category": "Funniest",
        "options": [],
        "nominations": [],
        "votes": [],
        "voting_open": False,
        "nomination_open": False,
        "results_visible": False,
        "photo_paths": [],
    }
    db, _ = _make_db(category)
    with pytest.raises(ValueError, match="closed"):
        await VoteService.nominate(db, user_id=7, category_id=2, nominee_name="Ana")
