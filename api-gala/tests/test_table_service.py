"""Unit tests for TableService — covers capacity calculation and leave_table fixes."""
import pytest
from unittest.mock import AsyncMock, MagicMock


def _make_db(*, user_doc=None, table_doc=None):
    user_coll = AsyncMock()
    user_coll.find_one.return_value = user_doc
    user_coll.update_one.return_value = MagicMock()

    table_coll = AsyncMock()
    table_coll.find_one.return_value = table_doc
    table_coll.update_one.return_value = MagicMock()
    table_coll.delete_one.return_value = MagicMock()

    db = MagicMock()
    db.__getitem__ = MagicMock(
        side_effect=lambda key: user_coll if key == "user" else table_coll
    )
    return db, user_coll, table_coll


# ---------------------------------------------------------------------------
# join_table — seat capacity
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_join_table_rejects_when_companions_fill_seats():
    """
    Table has seats=4. One person with 3 companions already occupies all 4 seats.
    A new user (0 companions) must be rejected.
    """
    from app.services.table import TableService

    existing_person = {
        "id": 1,
        "allergies": "",
        "dish": "NOR",
        "confirmed": True,
        "companions": [
            {"name": "A", "dish": "NOR", "allergies": ""},
            {"name": "B", "dish": "NOR", "allergies": ""},
            {"name": "C", "dish": "NOR", "allergies": ""},
        ],
    }
    user_doc = {
        "_id": 2,
        "nmec": 0,
        "name": "New User",
        "email": "u@ua.pt",
        "companions": [],
        "table_id": None,
        "registration_step": 6,
        "is_registered": True,
    }
    table_doc = {
        "_id": 10,
        "name": "Test",
        "seats": 4,
        "head": 1,
        "persons": [existing_person],
        "invites": [],
    }

    db, user_coll, table_coll = _make_db(user_doc=user_doc, table_doc=table_doc)
    # first find_one → user; second → table
    user_coll.find_one.return_value = user_doc
    table_coll.find_one.return_value = table_doc

    with pytest.raises(ValueError, match="full"):
        await TableService.join_table(db, user_id=2, table_id=10)


@pytest.mark.asyncio
async def test_join_table_allows_when_seats_available():
    """Table has seats=5, one person + 2 companions (3 seats used). New user fits."""
    from app.services.table import TableService

    existing_person = {
        "id": 1,
        "allergies": "",
        "dish": "NOR",
        "confirmed": True,
        "companions": [
            {"name": "A", "dish": "NOR", "allergies": ""},
            {"name": "B", "dish": "NOR", "allergies": ""},
        ],
    }
    user_doc = {
        "_id": 2,
        "nmec": 0,
        "name": "New",
        "email": "u@ua.pt",
        "companions": [],
        "table_id": None,
        "registration_step": 6,
        "is_registered": True,
    }
    table_doc = {
        "_id": 10,
        "name": "T",
        "seats": 5,
        "head": 1,
        "persons": [existing_person],
        "invites": [],
    }
    updated_table_doc = {**table_doc, "persons": [existing_person, {"id": 2, "allergies": "", "dish": "NOR", "confirmed": True, "companions": []}]}

    db, user_coll, table_coll = _make_db(user_doc=user_doc, table_doc=table_doc)
    user_coll.find_one.return_value = user_doc
    # first call → table; second call after update → updated table
    table_coll.find_one.side_effect = [table_doc, updated_table_doc]

    result = await TableService.join_table(db, user_id=2, table_id=10)
    assert result is not None
    table_coll.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_join_table_rejects_unregistered_user():
    """find_one returns None → ValueError before any table lookup."""
    from app.services.table import TableService

    db, _, table_coll = _make_db(user_doc=None)
    with pytest.raises(ValueError, match="registration"):
        await TableService.join_table(db, user_id=99, table_id=10)
    table_coll.find_one.assert_not_called()


# ---------------------------------------------------------------------------
# leave_table — head reassignment and empty table cleanup
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_leave_table_deletes_when_last_person():
    """Last person leaves → table is deleted."""
    from app.services.table import TableService

    user_doc = {"_id": 1, "nmec": 0, "name": "H", "email": "h@ua.pt", "table_id": 10, "companions": [], "registration_step": 6, "is_registered": True}
    # After $pull the table has no persons
    table_doc_after = {"_id": 10, "name": "T", "seats": 10, "head": 1, "persons": [], "invites": []}

    db, _, table_coll = _make_db(user_doc=user_doc, table_doc=table_doc_after)

    result = await TableService.leave_table(db, user_id=1)
    assert result is True
    table_coll.delete_one.assert_called_once_with({"_id": 10})
    # Only the $pull update should have run; no head-reassignment $set
    calls = [str(c) for c in table_coll.update_one.call_args_list]
    assert not any("head" in c for c in calls)


@pytest.mark.asyncio
async def test_leave_table_reassigns_head():
    """Head leaves, one person remains → that person becomes the new head."""
    from app.services.table import TableService

    user_doc = {"_id": 1, "nmec": 0, "name": "H", "email": "h@ua.pt", "table_id": 10, "companions": [], "registration_step": 6, "is_registered": True}
    remaining_person = {"id": 2, "allergies": "", "dish": "NOR", "confirmed": True, "companions": []}
    table_doc_after = {"_id": 10, "name": "T", "seats": 10, "head": 1, "persons": [remaining_person], "invites": []}

    db, _, table_coll = _make_db(user_doc=user_doc, table_doc=table_doc_after)

    result = await TableService.leave_table(db, user_id=1)
    assert result is True
    table_coll.delete_one.assert_not_called()
    table_coll.update_one.assert_called_with(
        {"_id": 10},
        {"$pull": {"persons": {"id": 1}}, "$set": {"head": 2}},
        bypass_document_validation=True,
    )


@pytest.mark.asyncio
async def test_leave_table_no_crash_on_empty_persons_list():
    """
    Regression: if the re-fetched table has head==user but persons==[],
    indexing [0] must not raise IndexError.
    """
    from app.services.table import TableService

    user_doc = {"_id": 1, "nmec": 0, "name": "H", "email": "h@ua.pt", "table_id": 10, "companions": [], "registration_step": 6, "is_registered": True}
    # Simulate the race: table already emptied by someone else before we re-fetch
    table_doc_after = {"_id": 10, "name": "T", "seats": 10, "head": 1, "persons": [], "invites": []}

    db, _, table_coll = _make_db(user_doc=user_doc, table_doc=table_doc_after)

    # Must not raise
    result = await TableService.leave_table(db, user_id=1)
    assert result is True
    # Empty table → deleted, not attempted head reassignment
    table_coll.delete_one.assert_called_once_with({"_id": 10})
