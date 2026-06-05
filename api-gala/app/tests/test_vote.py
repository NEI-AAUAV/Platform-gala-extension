import pytest
from httpx import AsyncClient
from app.api.auth import ScopeEnum
from app.api.vote.create import VoteCategoryCreateForm
from app.api.vote.edit import VoteCategoryEditForm
from app.api.vote.nomination import NominationForm
from app.api.vote.vote import VoteForm

from app.core.config import Settings
from app.core.db.types import DBType
from app.models.user import User
from app.models.vote import Vote, VoteCategory, VoteListing

from ._utils import (
    auth_data,
    create_test_user,
    create_registered_test_user,
    mark_open_timeslot,
    mark_closed_timeslot,
    mark_open_nominations_timeslot,
    set_results_visible,
)

test_category = VoteCategory(
    _id=0,
    category="GOOD",
    options=["Option 1", "Option 2"],
    photo_paths=["", ""],
    votes=[],
)


# ==========================
# == LIST VOTE CATEGORIES ==
# ==========================


@pytest.mark.asyncio
async def test_list_categories_logged_out(
    settings: Settings, client: AsyncClient
) -> None:
    response = await client.get(f"{settings.API_V1_STR}/voting/categories")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data()],
    indirect=["client"],
)
async def test_list_categories(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))
    test_category2 = test_category.copy()
    test_category2.category += "2"
    test_category2.id += 1
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    response = await client.get(f"{settings.API_V1_STR}/voting/categories")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 2

    VoteListing(**body[0])
    VoteListing(**body[1])


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_list_categories_scores(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await set_results_visible(db=db)
    test_category2 = test_category.copy()
    test_category2.votes = [
        Vote(uid=1, option=1),
        Vote(uid=2, option=0),
        Vote(uid=3, option=0),
        Vote(uid=4, option=1),
        Vote(uid=5, option=1),
    ]
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    response = await client.get(f"{settings.API_V1_STR}/voting/categories")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 1

    category = VoteListing(**body[0])
    assert category.already_voted is None
    assert category.scores == [2, 3]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_list_categories_already_voted(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await set_results_visible(db=db)
    test_category2 = test_category.copy()
    test_category2.votes = [
        Vote(uid=0, option=1),
    ]
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    response = await client.get(f"{settings.API_V1_STR}/voting/categories")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 1

    category = VoteListing(**body[0])
    assert category.already_voted is not None
    assert category.scores == [0, 1]


# =======================
# == GET VOTE CATEGORY ==
# =======================


@pytest.mark.asyncio
async def test_get_category_logged_out(settings: Settings, client: AsyncClient) -> None:
    response = await client.get(f"{settings.API_V1_STR}/voting/1")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data()],
    indirect=["client"],
)
async def test_get_category_not_found(settings: Settings, client: AsyncClient) -> None:
    response = await client.get(f"{settings.API_V1_STR}/voting/1")
    assert response.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data()],
    indirect=["client"],
)
async def test_get_category(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    response = await client.get(f"{settings.API_V1_STR}/voting/{test_category.id}")
    assert response.status_code == 200
    body = response.json()

    category = VoteListing(**body)
    assert category.id == test_category.id
    assert category.category == test_category.category
    assert category.options == test_category.options


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_get_category_scores(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await set_results_visible(db=db)
    test_category2 = test_category.copy()
    test_category2.votes = [
        Vote(uid=1, option=1),
        Vote(uid=2, option=0),
        Vote(uid=3, option=0),
        Vote(uid=4, option=1),
        Vote(uid=5, option=1),
    ]
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    response = await client.get(f"{settings.API_V1_STR}/voting/{test_category2.id}")
    assert response.status_code == 200
    body = response.json()

    category = VoteListing(**body)
    assert category.id == test_category.id
    assert category.category == test_category.category
    assert category.options == test_category.options
    assert category.already_voted is None
    assert category.scores == [2, 3]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_get_category_already_voted(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await set_results_visible(db=db)
    test_category2 = test_category.copy()
    test_category2.votes = [
        Vote(uid=0, option=1),
    ]
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    response = await client.get(f"{settings.API_V1_STR}/voting/{test_category2.id}")
    assert response.status_code == 200
    body = response.json()

    category = VoteListing(**body)
    assert category.id == test_category.id
    assert category.category == test_category.category
    assert category.options == test_category.options
    assert category.already_voted is not None
    assert category.scores == [0, 1]


# =======================
# == NEW VOTE CATEGORY ==
# =======================


@pytest.mark.asyncio
async def test_new_category_logged_out(settings: Settings, client: AsyncClient) -> None:
    response = await client.post(f"{settings.API_V1_STR}/voting/new")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data()],
    indirect=["client"],
)
async def test_new_category_unauthorized(
    settings: Settings, client: AsyncClient
) -> None:
    form = VoteCategoryCreateForm(
        category="GOOD", options=["Option 1", "Option 2"], photo_paths=["", ""]
    )
    response = await client.post(f"{settings.API_V1_STR}/voting/new", json=form.dict())
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_new_category(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    form = VoteCategoryCreateForm(
        category="GOOD", options=["Option 1", "Option 2"], photo_paths=["", ""]
    )
    response = await client.post(f"{settings.API_V1_STR}/voting/new", json=form.dict())
    assert response.status_code == 200
    body = response.json()

    category = VoteCategory(**body)
    assert category.category == "GOOD"
    assert category.options == ["Option 1", "Option 2"]
    assert len(category.votes) == 0

    db_res = await VoteCategory.get_collection(db).find_one({"_id": category.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)
    assert category == db_category_res


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_new_category_same_name(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteCategoryCreateForm(
        category=test_category.category,
        options=["Option 1", "Option 2"],
        photo_paths=["", ""],
    )
    response = await client.post(f"{settings.API_V1_STR}/voting/new", json=form.dict())
    assert response.status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_new_category_icu_equality(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    new_category = test_category.category.lower()
    assert test_category.category != new_category

    form = VoteCategoryCreateForm(
        category=new_category,
        options=["Option 1", "Option 2"],
        photo_paths=["", ""],
    )
    response = await client.post(f"{settings.API_V1_STR}/voting/new", json=form.dict())
    assert response.status_code == 409


# ========================
# == EDIT VOTE CATEGORY ==
# ========================


@pytest.mark.asyncio
async def test_edit_category_logged_out(
    settings: Settings, client: AsyncClient
) -> None:
    response = await client.put(f"{settings.API_V1_STR}/voting/1/edit")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data()],
    indirect=["client"],
)
async def test_edit_category_unauthorized(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))
    form = VoteCategoryEditForm(category=test_category.category + "2")
    response = await client.put(
        f"{settings.API_V1_STR}/voting/{test_category.id}/edit",
        json=form.dict(exclude_unset=True),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_edit_category_not_found(settings: Settings, client: AsyncClient) -> None:
    form = VoteCategoryEditForm(category=test_category.category + "2")
    response = await client.put(
        f"{settings.API_V1_STR}/voting/1/edit", json=form.dict(exclude_unset=True)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_edit_category(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    new_name = test_category.category + "2"
    assert new_name != test_category.category

    form = VoteCategoryEditForm(category=new_name)
    response = await client.put(
        f"{settings.API_V1_STR}/voting/{test_category.id}/edit",
        json=form.dict(exclude_unset=True),
    )
    assert response.status_code == 200
    category = VoteCategory(**response.json())

    assert category.category == new_name
    assert category.options == test_category.options

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)

    test_category_mod = test_category.copy()
    test_category_mod.category = new_name

    assert category == test_category_mod
    assert test_category_mod == db_category_res


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_edit_category_rejects_option_changes_after_votes(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    category = test_category.copy()
    category.votes = [Vote(uid=1, option=0)]
    await VoteCategory.get_collection(db).insert_one(category.dict(by_alias=True))

    form = VoteCategoryEditForm(options=["Option 2", "Option 1"])
    response = await client.put(
        f"{settings.API_V1_STR}/voting/{category.id}/edit",
        json=form.dict(exclude_unset=True),
    )

    assert response.status_code == 400
    db_res = await VoteCategory.get_collection(db).find_one({"_id": category.id})
    assert VoteCategory(**db_res).options == category.options


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_edit_category_allows_non_option_changes_after_votes(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    category = test_category.copy()
    category.votes = [Vote(uid=1, option=0)]
    await VoteCategory.get_collection(db).insert_one(category.dict(by_alias=True))

    form = VoteCategoryEditForm(description="Updated")
    response = await client.put(
        f"{settings.API_V1_STR}/voting/{category.id}/edit",
        json=form.dict(exclude_unset=True),
    )

    assert response.status_code == 200
    assert response.json()["description"] == "Updated"
    assert response.json()["options"] == category.options


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(scopes=[ScopeEnum.MANAGER_GALA])],
    indirect=["client"],
)
async def test_edit_category_same_name(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))
    test_category2 = test_category.copy()
    test_category2.id += 1
    test_category2.category += "2"
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    form = VoteCategoryEditForm(category=test_category.category)
    response = await client.put(
        f"{settings.API_V1_STR}/voting/{test_category2.id}/edit",
        json=form.dict(exclude_unset=True),
    )
    assert response.status_code == 409

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category2.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)
    assert test_category2 == db_category_res


# ===============
# == CAST VOTE ==
# ===============


@pytest.mark.asyncio
async def test_cast_vote_logged_out(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await mark_open_timeslot(db=db)
    response = await client.post(f"{settings.API_V1_STR}/voting/categories/1/vote")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data()],
    indirect=["client"],
)
async def test_cast_vote_no_user(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await mark_open_timeslot(db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))
    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote(settings: Settings, client: AsyncClient, db: DBType) -> None:
    await mark_open_timeslot(db=db)
    await set_results_visible(db=db)
    await create_registered_test_user(id=0, db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 200
    listing = VoteListing(**response.json())

    assert listing.already_voted is not None
    assert listing.scores == [1, 0]

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)

    mod_test_category = test_category.copy()
    mod_test_category.votes = mod_test_category.votes.copy()
    mod_test_category.votes.append(Vote(uid=0, option=0))

    assert mod_test_category == db_category_res


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote_already_voted(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await mark_open_timeslot(db=db)
    await create_registered_test_user(id=0, db=db)
    test_category2 = test_category.copy()
    test_category2.votes = test_category2.votes.copy()
    test_category2.votes.append(Vote(uid=0, option=0))
    await VoteCategory.get_collection(db).insert_one(test_category2.dict(by_alias=True))

    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category2.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 409

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category2.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)
    assert test_category2 == db_category_res


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote_bad_option(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await mark_open_timeslot(db=db)
    await create_registered_test_user(id=0, db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteForm(option=len(test_category.options))
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 400

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)
    assert test_category == db_category_res


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote_time_slot_closed(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await mark_closed_timeslot(db=db)
    await create_registered_test_user(id=0, db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 409

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category.id})
    assert db_res is not None
    db_category_res = VoteCategory(**db_res)
    assert test_category == db_category_res


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote_unregistered_user(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """User doc exists but is_registered=False → 403."""
    await mark_open_timeslot(db=db)
    await create_test_user(id=0, db=db)  # is_registered=False by default
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote_inactive_registration(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """User is registered but registration_active=False → 403."""
    from app.models.user import User

    await mark_open_timeslot(db=db)
    user = User(
        _id=0, matriculation=None, nmec=1, email="dev@dev.dev", name="J",
        is_registered=True, registration_active=False,
    )
    await User.get_collection(db).insert_one(user.dict(by_alias=True))
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_cast_vote_no_timeslot_configured(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """No TimeSlots document in DB → check_votes_open raises 409."""
    await create_registered_test_user(id=0, db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = VoteForm(option=0)
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/vote",
        json=form.dict(),
    )
    assert response.status_code == 409


# ====================
# == NOMINATIONS ==
# ====================


@pytest.mark.asyncio
async def test_submit_nomination_logged_out(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/nominate",
        json={"name": "Test Person"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_submit_nomination_no_user_doc(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """No user doc at all → 403."""
    await mark_open_nominations_timeslot(db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = NominationForm(name="Test Person")
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/nominate",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_submit_nomination_unregistered_user(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """User doc exists but is_registered=False → 403."""
    await mark_open_nominations_timeslot(db=db)
    await create_test_user(id=0, db=db)  # is_registered=False by default
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = NominationForm(name="Test Person")
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/nominate",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_submit_nomination_inactive_registration(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """User registered but registration_active=False → 403."""
    from app.models.user import User

    await mark_open_nominations_timeslot(db=db)
    user = User(
        _id=0, matriculation=None, nmec=1, email="dev@dev.dev", name="J",
        is_registered=True, registration_active=False,
    )
    await User.get_collection(db).insert_one(user.dict(by_alias=True))
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = NominationForm(name="Test Person")
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/nominate",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_submit_nomination_window_closed(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """Registered user but nominations window not configured → 403."""
    await create_registered_test_user(id=0, db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))
    # No timeslot document → nominations_start/end are None → is_nominations_open returns False

    form = NominationForm(name="Test Person")
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/nominate",
        json=form.dict(),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_submit_nomination_success(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    """Registered user + open nominations window → 200."""
    await mark_open_nominations_timeslot(db=db)
    await create_registered_test_user(id=0, db=db)
    await VoteCategory.get_collection(db).insert_one(test_category.dict(by_alias=True))

    form = NominationForm(name="Test Person")
    response = await client.post(
        f"{settings.API_V1_STR}/voting/categories/{test_category.id}/nominate",
        json=form.dict(),
    )
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    db_res = await VoteCategory.get_collection(db).find_one({"_id": test_category.id})
    assert db_res is not None
    category = VoteCategory(**db_res)
    assert any(n.name == "Test Person" and 0 in n.votes for n in category.nominations)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "client",
    [auth_data(sub=0)],
    indirect=["client"],
)
async def test_get_nomination_suggestions_global_pool(
    settings: Settings, client: AsyncClient, db: DBType
) -> None:
    await VoteCategory.get_collection(db).insert_one(
        VoteCategory(_id=10, category="CAT A", options=[], photo_paths=[]).dict(by_alias=True)
    )
    await VoteCategory.get_collection(db).insert_one(
        VoteCategory(
            _id=11,
            category="CAT B",
            options=[],
            photo_paths=[],
            nominations=[{"name": "Joana Prime", "votes": [1]}],
        ).dict(by_alias=True)
    )

    user = User(
        _id=0,
        matriculation=None,
        nmec=1,
        email="user0@test.com",
        name="Joao Silva",
        is_registered=True,
        registration_active=True,
        companions=[{"name": "Joana Companion", "email": "comp@test.com"}],
    )
    await User.get_collection(db).insert_one(user.dict(by_alias=True))

    # Duplicate candidate from another source should only appear once.
    another_user = User(
        _id=1,
        matriculation=None,
        nmec=2,
        email="user1@test.com",
        name="joao silva",
        is_registered=True,
        registration_active=True,
    )
    await User.get_collection(db).insert_one(another_user.dict(by_alias=True))

    response = await client.get(
        f"{settings.API_V1_STR}/voting/nominees/suggest",
        params={"q": "Joa", "category_id": 10},
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert "Joao Silva" in body
    assert "Joana Companion" in body
    assert "Joana Prime" in body
    assert len([name for name in body if name.lower() == "joao silva"]) == 1
