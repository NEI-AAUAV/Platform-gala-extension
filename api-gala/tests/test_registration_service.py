"""Unit tests for RegistrationService - registration flow, step transitions, payment states."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pymongo.errors import DuplicateKeyError


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_doc(**kwargs):
    base = {
        "_id": 1, "nmec": 12345, "name": "Test User", "email": "test@ua.pt",
        "registration_step": 1, "is_registered": False, "phone": None,
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


def _make_db(*find_returns):
    user_coll = AsyncMock()
    user_coll.find_one.side_effect = list(find_returns)
    user_coll.update_one.return_value = MagicMock(matched_count=1, modified_count=1)
    user_coll.insert_one.return_value = MagicMock()
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=user_coll)
    return db, user_coll


# ---------------------------------------------------------------------------
# get_user_registration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_user_registration_returns_user_when_found():
    from app.services.registration import RegistrationService

    doc = _user_doc()
    db, _ = _make_db(doc)
    user = await RegistrationService.get_user_registration(db, user_id=1)
    assert user is not None
    assert user.id == 1
    assert user.name == "Test User"


@pytest.mark.asyncio
async def test_get_user_registration_returns_none_when_missing():
    from app.services.registration import RegistrationService

    db, _ = _make_db(None)
    user = await RegistrationService.get_user_registration(db, user_id=99)
    assert user is None


# ---------------------------------------------------------------------------
# get_or_create_user_registration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_or_create_returns_existing_without_inserting():
    from app.services.registration import RegistrationService

    doc = _user_doc()
    db, user_coll = _make_db(doc)
    user = await RegistrationService.get_or_create_user_registration(
        db, user_id=1, email="test@ua.pt", name="Test User", nmec=12345
    )
    assert user.id == 1
    user_coll.insert_one.assert_not_called()


@pytest.mark.asyncio
async def test_get_or_create_inserts_when_not_found():
    from app.services.registration import RegistrationService

    # first find_one (existence check) → None; insert succeeds
    db, user_coll = _make_db(None)
    user = await RegistrationService.get_or_create_user_registration(
        db, user_id=1, email="new@ua.pt", name="New User", nmec=None
    )
    assert user.email == "new@ua.pt"
    user_coll.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_get_or_create_recovers_from_duplicate_key_error():
    """Race: two requests concurrently create the same user - second insert raises DuplicateKeyError.
    The service must retry find_one and return the existing doc."""
    from app.services.registration import RegistrationService

    doc = _user_doc()
    db, user_coll = _make_db(None, doc)  # first find → None, second find → doc
    user_coll.insert_one.side_effect = DuplicateKeyError("duplicate")

    user = await RegistrationService.get_or_create_user_registration(
        db, user_id=1, email="test@ua.pt", name="Test User", nmec=12345
    )
    assert user.id == 1
    assert user_coll.find_one.call_count == 2


# ---------------------------------------------------------------------------
# payment_review_state
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_payment_review_state_confirmed_phase1():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(payment_phase1_confirmed=True, payment_proof_url="https://proof"))
    assert RegistrationService.payment_review_state(user, phase=1) == "confirmed"


@pytest.mark.asyncio
async def test_payment_review_state_review_phase1():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(payment_proof_url="https://proof"))
    assert RegistrationService.payment_review_state(user, phase=1) == "review"


@pytest.mark.asyncio
async def test_payment_review_state_missing_phase1():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    assert RegistrationService.payment_review_state(user, phase=1) == "missing"


@pytest.mark.asyncio
async def test_payment_review_state_confirmed_phase2():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(payment_phase2_confirmed=True, payment_proof_url_phase2="https://p2"))
    assert RegistrationService.payment_review_state(user, phase=2) == "confirmed"


@pytest.mark.asyncio
async def test_payment_review_state_review_phase2():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(payment_proof_url_phase2="https://p2"))
    assert RegistrationService.payment_review_state(user, phase=2) == "review"


# ---------------------------------------------------------------------------
# _handle_step_5 - table selection logic
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_handle_step_5_creates_new_table():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    db, _ = _make_db()

    with patch("app.services.registration.RegistrationService._check_tables_open", new_callable=AsyncMock), \
         patch("app.services.registration.TableService.create_table", new_callable=AsyncMock) as mock_create:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "new", "table_name": "Mesa Geral"})
        mock_create.assert_awaited_once_with(db, 1, "Mesa Geral")


@pytest.mark.asyncio
async def test_handle_step_5_skips_create_if_already_in_table():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(table_id=5))
    db, _ = _make_db()

    with patch("app.services.registration.TableService.create_table", new_callable=AsyncMock) as mock_create:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "new"})
        mock_create.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_step_5_leaves_table_on_none():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(table_id=5))
    db, _ = _make_db()

    with patch("app.services.registration.TableService.leave_table", new_callable=AsyncMock) as mock_leave:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "none"})
        mock_leave.assert_awaited_once_with(db, 1)


@pytest.mark.asyncio
async def test_handle_step_5_leaves_table_on_null():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(table_id=5))
    db, _ = _make_db()

    with patch("app.services.registration.TableService.leave_table", new_callable=AsyncMock) as mock_leave:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "null"})
        mock_leave.assert_awaited_once_with(db, 1)


@pytest.mark.asyncio
async def test_handle_step_5_joins_via_invite():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    db, _ = _make_db({"_id": 10, "invites": [1]})

    with patch("app.services.registration.RegistrationService._check_tables_open", new_callable=AsyncMock), \
         patch("app.services.registration.TableService.join_via_invite", new_callable=AsyncMock) as mock_join:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "10"})
        mock_join.assert_awaited_once_with(db, user, 10)


@pytest.mark.asyncio
async def test_handle_step_5_skips_join_if_already_in_target():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc(table_id=10))
    db, _ = _make_db()

    with patch("app.services.registration.TableService.join_via_invite", new_callable=AsyncMock) as mock_join:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "10"})
        mock_join.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_step_5_does_nothing_for_invited_flag():
    from app.services.registration import RegistrationService
    from app.models.user import User

    user = User.parse_obj(_user_doc())
    db, _ = _make_db()

    with patch("app.services.registration.TableService.create_table", new_callable=AsyncMock) as mc, \
         patch("app.services.registration.TableService.leave_table", new_callable=AsyncMock) as ml, \
         patch("app.services.registration.TableService.join_via_invite", new_callable=AsyncMock) as mj:
        await RegistrationService._handle_step_5(db, user, user_id=1, data={"table_id": "invited"})
        mc.assert_not_awaited()
        ml.assert_not_awaited()
        mj.assert_not_awaited()


# ---------------------------------------------------------------------------
# update_step - step transitions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_step_2_syncs_companions():
    from app.services.registration import RegistrationService

    user_doc = _user_doc()
    updated_doc = _user_doc(registration_step=2)
    db, _ = _make_db(user_doc, updated_doc)
    companions = [{"name": "Alice", "dish": "NOR", "allergies": ""}]
    normalized = [{"name": "Alice", "dish": "meat", "allergies": "", "email": None}]

    meat_meal = MagicMock(id="meat", dish_type="NOR", is_active=True)
    with patch("app.services.registration.TableService.sync_companions", new_callable=AsyncMock) as mock_sync, \
         patch("app.services.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=MagicMock(meals=[meat_meal])):
        await RegistrationService.update_step(db, user_id=1, step=2, data={"companions": companions})
        mock_sync.assert_awaited_once_with(db, 1, normalized)


@pytest.mark.asyncio
async def test_update_step_3_syncs_companions():
    from app.services.registration import RegistrationService

    user_doc = _user_doc()
    updated_doc = _user_doc(registration_step=3)
    db, _ = _make_db(user_doc, updated_doc)
    companions = [{"name": "Bob", "dish": "VEG", "allergies": "gluten"}]
    normalized = [{"name": "Bob", "dish": "veg", "allergies": "gluten", "email": None}]

    veg_meal = MagicMock(id="veg", dish_type="VEG", is_active=True)
    with patch("app.services.registration.TableService.sync_companions", new_callable=AsyncMock) as mock_sync, \
         patch("app.services.registration.TableService.sync_user_dish", new_callable=AsyncMock), \
         patch("app.services.registration.TableService.sync_user_allergies", new_callable=AsyncMock), \
         patch("app.services.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=MagicMock(meals=[veg_meal])):
        await RegistrationService.update_step(db, user_id=1, step=3, data={"companions": companions})
        mock_sync.assert_awaited_once_with(db, 1, normalized)


@pytest.mark.asyncio
async def test_update_step_no_sync_without_companions_key():
    from app.services.registration import RegistrationService

    user_doc = _user_doc()
    updated_doc = _user_doc(bus_option="ROUND_TRIP")
    db, _ = _make_db(user_doc, updated_doc)

    with patch("app.services.registration.TableService.sync_companions", new_callable=AsyncMock) as mock_sync, \
         patch("app.services.registration.TableService.sync_user_dish", new_callable=AsyncMock), \
         patch("app.services.registration.TableService.sync_user_allergies", new_callable=AsyncMock):
        # no "companions" key in data → sync_companions must not be called (no config fetch either)
        await RegistrationService.update_step(db, user_id=1, step=3, data={"bus_option": "ROUND_TRIP"})
        mock_sync.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_step_raises_when_user_not_found():
    from app.services.registration import RegistrationService

    db, _ = _make_db(None)
    with pytest.raises(ValueError, match="não encontrado"):
        await RegistrationService.update_step(db, user_id=99, step=2, data={})


@pytest.mark.asyncio
async def test_update_step_6_marks_registered():
    from app.services.registration import RegistrationService

    user_doc = _user_doc(registration_step=5)
    updated_doc = _user_doc(registration_step=6, is_registered=True)
    db, user_coll = _make_db(user_doc, updated_doc)

    await RegistrationService.update_step(db, user_id=1, step=6, data={})
    update_call = user_coll.update_one.call_args
    assert update_call[0][1]["$set"].get("is_registered") is True


@pytest.mark.asyncio
async def test_apply_payment_deadline_policy_expired_deadline():
    from app.services.registration import RegistrationService
    from app.models.config import GlobalConfig, PriceConfig

    # Reset the last run global variable to bypass TTL
    import app.services.registration
    app.services.registration._deadline_policy_last_run = None

    # Setup mock config
    mock_config = GlobalConfig(
        payment_deadline_date="2026-05-15",
        prices=PriceConfig(
            phase1_deadline="2026-05-10",
            phase2_deadline="2026-05-20",
        )
    )

    # Mock DB and collection
    user_coll = AsyncMock()
    user_coll.update_many.return_value = MagicMock()
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=user_coll)

    with patch("app.services.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=mock_config), \
         patch("app.services.registration.is_deadline_passed", return_value=True) as mock_passed:

        await RegistrationService.apply_payment_deadline_policy(db)

        # ConfigService.get_config should be called
        # is_deadline_passed should be called for each deadline
        # user_coll.update_many should be called for expired deadlines
        assert mock_passed.call_count == 3
        assert user_coll.update_many.call_count == 3


@pytest.mark.asyncio
async def test_apply_payment_deadline_policy_no_deadline_passed():
    from app.services.registration import RegistrationService
    from app.models.config import GlobalConfig, PriceConfig

    import app.services.registration
    app.services.registration._deadline_policy_last_run = None

    mock_config = GlobalConfig(
        payment_deadline_date="2026-06-15",
        prices=PriceConfig(
            phase1_deadline="2026-06-10",
            phase2_deadline="2026-06-20",
        )
    )

    user_coll = AsyncMock()
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=user_coll)

    with patch("app.services.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=mock_config), \
         patch("app.services.registration.is_deadline_passed", return_value=False) as mock_passed:

        await RegistrationService.apply_payment_deadline_policy(db)

        assert mock_passed.call_count == 3
        user_coll.update_many.assert_not_called()

