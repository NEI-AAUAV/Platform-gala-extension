"""Unit tests for TableService - create_table, join_via_invite, sync_companions,
create_empty_table, delete_table."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_doc(**kwargs):
    base = {
        "_id": 1, "nmec": 12345, "name": "Test User", "email": "test@ua.pt",
        "registration_step": 6, "is_registered": True, "phone": None,
        "bus_option": "NONE", "meal_option": None, "food_allergies": None,
        "has_payed": False, "phased_payment": False, "payment_proof_url": None,
        "payment_proof_url_phase2": None, "payment_phase1_confirmed": False,
        "payment_phase2_confirmed": False, "payment_expired": False,
        "payment_reminder_sent": False, "registration_active": True,
        "table_id": None, "bus_assignment": None, "companions": [],
        "admin_created": False, "companion_emails": [], "is_companion_of": None,
        "matriculation": None,
    }
    base.update(kwargs)
    return base


def _table_doc(**kwargs):
    base = {
        "_id": 1, "name": "Test Table", "photo_url": None,
        "invite_token": "TESTTOKEN", "invites": [], "head": 1,
        "seats": 10, "persons": [],
    }
    base.update(kwargs)
    return base


def _make_db(user_finds=(), table_finds=()):
    user_coll = AsyncMock()
    table_coll = AsyncMock()

    if len(user_finds) == 1:
        user_coll.find_one.return_value = user_finds[0]
    elif len(user_finds) > 1:
        user_coll.find_one.side_effect = list(user_finds)

    if len(table_finds) == 1:
        table_coll.find_one.return_value = table_finds[0]
    elif len(table_finds) > 1:
        table_coll.find_one.side_effect = list(table_finds)

    user_coll.update_one.return_value = MagicMock()
    table_coll.update_one.return_value = MagicMock()
    user_coll.update_many.return_value = MagicMock()
    table_coll.insert_one.return_value = MagicMock()
    table_coll.delete_one.return_value = MagicMock()

    db = MagicMock()
    db.__getitem__ = MagicMock(side_effect=lambda n: user_coll if n == "user" else table_coll)
    return db, user_coll, table_coll


# ---------------------------------------------------------------------------
# create_table
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_table_happy_path():
    from app.services.table import TableService

    user_doc = _user_doc()
    db, user_coll, table_coll = _make_db(user_finds=(user_doc,))

    with patch("app.services.table.TableService._get_next_id", new_callable=AsyncMock, return_value=42):
        table = await TableService.create_table(db, user_id=1, name="Mesa Test")

    assert table.id == 42
    assert table.head == 1
    assert len(table.persons) == 1
    assert table.persons[0].id == 1
    table_coll.insert_one.assert_called_once()
    user_coll.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_create_table_user_not_found_raises():
    from app.services.table import TableService

    db, _, table_coll = _make_db(user_finds=(None,))

    with patch("app.services.table.TableService._get_next_id", new_callable=AsyncMock, return_value=42):
        with pytest.raises(ValueError, match="registration"):
            await TableService.create_table(db, user_id=99, name="Mesa Test")

    table_coll.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_create_table_user_already_in_table_raises():
    from app.services.table import TableService

    user_doc = _user_doc(table_id=5)
    db, _, table_coll = _make_db(user_finds=(user_doc,))

    with patch("app.services.table.TableService._get_next_id", new_callable=AsyncMock, return_value=42):
        with pytest.raises(ValueError, match="already"):
            await TableService.create_table(db, user_id=1, name="Mesa Test")

    table_coll.insert_one.assert_not_called()


# ---------------------------------------------------------------------------
# join_via_invite
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_join_via_invite_success():
    from app.services.table import TableService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    table_doc = _table_doc(invites=[1])
    db, user_coll, table_coll = _make_db(table_finds=(table_doc,))

    await TableService.join_via_invite(db, user, target_id=1)

    table_coll.find_one_and_update.assert_called_once()
    call_update = table_coll.find_one_and_update.call_args[0][1]
    assert "$push" in call_update and "persons" in call_update["$push"]
    assert call_update["$pull"] == {"invites": 1}
    user_coll.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_join_via_invite_not_in_invite_list_raises():
    from app.services.table import TableService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    table_doc = _table_doc(invites=[])  # user not invited
    db, _, table_coll = _make_db(table_finds=(table_doc,))

    with pytest.raises(ValueError, match="convite"):
        await TableService.join_via_invite(db, user, target_id=1)

    table_coll.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_join_via_invite_table_not_found_raises():
    from app.services.table import TableService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    db, _, _ = _make_db(table_finds=(None,))

    with pytest.raises(ValueError, match="convite"):
        await TableService.join_via_invite(db, user, target_id=99)


@pytest.mark.asyncio
async def test_join_via_invite_leaves_current_table_first():
    from app.services.table import TableService
    from app.models.user import User

    user = User.parse_obj(_user_doc(table_id=5))
    table_doc = _table_doc(invites=[1])
    db, _, _ = _make_db(table_finds=(table_doc,))

    with patch("app.services.table.TableService.leave_table", new_callable=AsyncMock) as mock_leave:
        await TableService.join_via_invite(db, user, target_id=1)
        mock_leave.assert_awaited_once_with(db, 1)


# ---------------------------------------------------------------------------
# sync_companions
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sync_companions_updates_table_when_user_assigned():
    from app.services.table import TableService

    user_doc = _user_doc(table_id=3)
    db, _, table_coll = _make_db(user_finds=(user_doc,))
    companions = [{"name": "Alice", "dish": "NOR", "allergies": ""}]

    await TableService.sync_companions(db, user_id=1, companions=companions)

    table_coll.update_one.assert_called_once()
    update = table_coll.update_one.call_args[0][1]
    assert update["$set"]["persons.$.companions"] == companions


@pytest.mark.asyncio
async def test_sync_companions_no_op_when_user_has_no_table():
    from app.services.table import TableService

    user_doc = _user_doc()  # table_id is None
    db, _, table_coll = _make_db(user_finds=(user_doc,))

    await TableService.sync_companions(db, user_id=1, companions=[])

    table_coll.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_sync_companions_no_op_when_user_not_found():
    from app.services.table import TableService

    db, _, table_coll = _make_db(user_finds=(None,))

    await TableService.sync_companions(db, user_id=99, companions=[])

    table_coll.update_one.assert_not_called()


# ---------------------------------------------------------------------------
# create_empty_table
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_empty_table_inserts_with_no_persons():
    from app.services.table import TableService

    db, _, table_coll = _make_db()

    with patch("app.services.table.TableService._get_next_id", new_callable=AsyncMock, return_value=7):
        table = await TableService.create_empty_table(db, name="Admin Table", seats=8)

    assert table.id == 7
    assert table.name == "Admin Table"
    assert table.seats == 8
    assert table.persons == []
    assert table.head is None
    assert table.invite_token is not None
    table_coll.insert_one.assert_called_once()


# ---------------------------------------------------------------------------
# delete_table
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_table_clears_users_and_returns_true():
    from app.services.table import TableService

    table_doc = _table_doc()
    db, user_coll, table_coll = _make_db(table_finds=(table_doc,))

    result = await TableService.delete_table(db, table_id=1)

    assert result is True
    user_coll.update_many.assert_called_once_with({"table_id": 1}, {"$unset": {"table_id": ""}})
    table_coll.delete_one.assert_called_once_with({"_id": 1})


@pytest.mark.asyncio
async def test_delete_table_returns_false_when_not_found():
    from app.services.table import TableService

    db, user_coll, table_coll = _make_db(table_finds=(None,))

    result = await TableService.delete_table(db, table_id=99)

    assert result is False
    user_coll.update_many.assert_not_called()
    table_coll.delete_one.assert_not_called()
