import pytest
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient
from app.main import app
from app.core.db import get_db, get_client
from app.api.auth import api_nei_auth, AuthData


COLLECTIONS = [
    "user",
    "config",
    "time_slots",
    "vote_category",
    "table",
    "manager_permissions",
    "limits",
    "registration",
]


def _make_collection_mock() -> MagicMock:
    mock = MagicMock()
    for method in ("find_one", "insert_one", "update_one", "delete_one",
                   "find_one_and_update", "insert_many", "delete_many",
                   "count_documents"):
        setattr(mock, method, AsyncMock())
    mock.find = MagicMock()
    return mock


@pytest.fixture(scope="session")
def test_db():
    db = MagicMock()
    for name in COLLECTIONS:
        setattr(db, name, _make_collection_mock())
    # Route db["collection_name"] → db.collection_name so get_collection() works
    db.__getitem__ = MagicMock(side_effect=lambda key: getattr(db, key))
    return db


def _make_client_overrides(auth_data: AuthData, test_db: MagicMock) -> None:
    mock_client = MagicMock()
    mock_client.close = MagicMock()
    app.dependency_overrides[api_nei_auth] = lambda: auth_data
    app.dependency_overrides[get_client] = lambda: mock_client
    app.dependency_overrides[get_db] = lambda: test_db


def _clear_client_overrides() -> None:
    for key in (api_nei_auth, get_client, get_db):
        app.dependency_overrides.pop(key, None)


@pytest.fixture
def mock_auth_data() -> AuthData:
    return AuthData(sub=1, nmec=12345, name="Test", surname="User",
                    email="test.user@ua.pt", scopes=["default"])


@pytest.fixture
def mock_admin_auth() -> AuthData:
    return AuthData(sub=99, nmec=99999, name="Admin", surname="User",
                    email="admin@ua.pt", scopes=["admin"])


@pytest.fixture
def mock_manager_auth() -> AuthData:
    return AuthData(sub=42, nmec=42000, name="Manager", surname="Gala",
                    email="manager@ua.pt", scopes=["manager-gala"])


TEST_BASE_URL = "https://test"


@pytest.fixture
async def async_client(mock_auth_data: AuthData, test_db) -> AsyncGenerator[AsyncClient, None]:
    _make_client_overrides(mock_auth_data, test_db)
    async with AsyncClient(app=app, base_url=TEST_BASE_URL) as ac:
        yield ac
    _clear_client_overrides()


@pytest.fixture
async def async_client_admin(mock_admin_auth: AuthData, test_db) -> AsyncGenerator[AsyncClient, None]:
    _make_client_overrides(mock_admin_auth, test_db)
    async with AsyncClient(app=app, base_url=TEST_BASE_URL) as ac:
        yield ac
    _clear_client_overrides()


@pytest.fixture
async def async_client_manager(mock_manager_auth: AuthData, test_db) -> AsyncGenerator[AsyncClient, None]:
    _make_client_overrides(mock_manager_auth, test_db)
    async with AsyncClient(app=app, base_url=TEST_BASE_URL) as ac:
        yield ac
    _clear_client_overrides()