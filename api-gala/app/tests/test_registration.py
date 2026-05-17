from datetime import MAXYEAR, datetime

import pytest
from httpx import AsyncClient

from app.api.auth import ScopeEnum
from app.core.config import Settings
from app.core.db.types import DBType
from app.models.limits import LIMITS_ID, Limits
from app.models.time_slots import TIME_SLOTS_ID, TimeSlots
from app.models.user import BusOption, User

from ._utils import auth_data, create_test_user


async def _seed_limits(db: DBType, *, max_registrations: int = 100, max_bus_seats: int | None = None) -> None:
    limits = Limits(maxRegistrations=max_registrations, maxBusSeats=max_bus_seats)
    await Limits.get_collection(db).update_one(
        {"_id": LIMITS_ID}, {"$set": {**limits.dict(), "_id": LIMITS_ID}}, upsert=True
    )


async def _open_registration_window(db: DBType) -> None:
    ts = TimeSlots(
        registrationStart=datetime(2026, 1, 2),
        registrationEnd=datetime(MAXYEAR, 12, 31),
    )
    await TimeSlots.get_collection(db).update_one(
        {"_id": TIME_SLOTS_ID}, {"$set": ts.dict()}, upsert=True
    )


async def _seed_bus_users(db: DBType, *, count: int) -> None:
    """Insert `count` registered users that already have a bus option."""
    for i in range(count):
        user = User(
            _id=100 + i,
            nmec=100 + i,
            email=f"bus{i}@test.dev",
            name=f"BusUser{i}",
            bus_option=BusOption.ROUND_TRIP,
            is_registered=True,
        )
        await User.get_collection(db).insert_one(user.dict(by_alias=True))


# ================================
# == BUS CAPACITY ENFORCEMENT ==
# ================================


@pytest.mark.asyncio
@pytest.mark.parametrize("client", [auth_data(sub=1)], indirect=["client"])
async def test_bus_selection_allowed_when_available(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """Step 3 succeeds when bus seats are available."""
    await _seed_limits(db, max_bus_seats=5)
    await _open_registration_window(db)
    await create_test_user(id=1, db=db)

    response = await client.post(
        f"{settings.API_V1_STR}/registration/step/3",
        json={"bus_option": "ROUND_TRIP"},
    )
    assert response.status_code == 200
    assert response.json()["bus_option"] == "ROUND_TRIP"


@pytest.mark.asyncio
@pytest.mark.parametrize("client", [auth_data(sub=1)], indirect=["client"])
async def test_bus_selection_rejected_when_full(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """Step 3 returns 409 when maxBusSeats is exhausted."""
    await _seed_limits(db, max_bus_seats=2)
    await _open_registration_window(db)
    await _seed_bus_users(db, count=2)
    await create_test_user(id=1, db=db)

    response = await client.post(
        f"{settings.API_V1_STR}/registration/step/3",
        json={"bus_option": "ROUND_TRIP"},
    )
    assert response.status_code == 409
    assert "autocarro" in response.json()["detail"]


@pytest.mark.asyncio
@pytest.mark.parametrize("client", [auth_data(sub=1)], indirect=["client"])
async def test_bus_none_allowed_when_full(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """Choosing NONE at step 3 is never blocked by bus capacity."""
    await _seed_limits(db, max_bus_seats=2)
    await _open_registration_window(db)
    await _seed_bus_users(db, count=2)
    await create_test_user(id=1, db=db)

    response = await client.post(
        f"{settings.API_V1_STR}/registration/step/3",
        json={"bus_option": "NONE"},
    )
    assert response.status_code == 200
    assert response.json()["bus_option"] == "NONE"


@pytest.mark.asyncio
@pytest.mark.parametrize("client", [auth_data(sub=1)], indirect=["client"])
async def test_bus_no_limit_configured(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """When maxBusSeats is None, capacity is unlimited and the check is skipped."""
    await _seed_limits(db, max_bus_seats=None)
    await _open_registration_window(db)
    await _seed_bus_users(db, count=999)
    await create_test_user(id=1, db=db)

    response = await client.post(
        f"{settings.API_V1_STR}/registration/step/3",
        json={"bus_option": "ONE_WAY"},
    )
    assert response.status_code == 200
    assert response.json()["bus_option"] == "ONE_WAY"


@pytest.mark.asyncio
@pytest.mark.parametrize("client", [auth_data(sub=1)], indirect=["client"])
async def test_bus_switch_not_double_counted(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """A user already on a bus switching to a different bus option is not blocked."""
    await _seed_limits(db, max_bus_seats=1)
    await _open_registration_window(db)

    # The requesting user already occupies the one bus seat.
    user = User(
        _id=1,
        nmec=1,
        email="dev@dev.dev",
        name="J",
        bus_option=BusOption.ROUND_TRIP,
    )
    await User.get_collection(db).insert_one(user.dict(by_alias=True))

    # Switching from ROUND_TRIP to ONE_WAY must succeed — the user already holds
    # the seat so the count does not increase.
    response = await client.post(
        f"{settings.API_V1_STR}/registration/step/3",
        json={"bus_option": "ONE_WAY"},
    )
    assert response.status_code == 200
    assert response.json()["bus_option"] == "ONE_WAY"
