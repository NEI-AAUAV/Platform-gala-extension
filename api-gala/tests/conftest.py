import pytest
import asyncio
from typing import AsyncGenerator
import motor.motor_asyncio
from httpx import AsyncClient
from app.main import app
from app.core.db import get_db, get_client, DBType
from app.api.auth import api_nei_auth, AuthData

TEST_DB_NAME = "gala_test_db"
TEST_MONGO_URL = "mongodb://localhost:27017" # Adjust if necessary

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

from unittest.mock import AsyncMock, MagicMock

@pytest.fixture(scope="session")
async def test_db():
    # Use AsyncMock to mock the MongoDB interactions to avoid test hanging
    # This acts as a completely mocked database
    db = MagicMock()
    
    # Example collections
    db.users = AsyncMock()
    db.global_config = AsyncMock()
    db.time_slots = AsyncMock()
    db.vote_categories = AsyncMock()
    db.vote_cast = AsyncMock()
    db.table_groups = AsyncMock()
    
    # Mock specific return values if needed in the tests, but default AsyncMock is fine for most
    yield db

@pytest.fixture
def mock_auth_data():
    return AuthData(
        sub=1,
        nmec=12345,
        name="Test",
        surname="User",
        email="test.user@ua.pt",
        scopes=["default"]
    )

@pytest.fixture
def override_auth(mock_auth_data: AuthData):
    def _auth_override():
        return mock_auth_data
    app.dependency_overrides[api_nei_auth] = _auth_override
    yield
    app.dependency_overrides.pop(api_nei_auth, None)

@pytest.fixture
async def async_client(test_db, override_auth) -> AsyncGenerator[AsyncClient, None]:
    # Need to override get_client to prevent real connection in lifespan
    from unittest.mock import MagicMock
    mock_db_client = MagicMock()
    mock_db_client.close = MagicMock()
    mock_db_client.client = MagicMock()
    
    def override_get_client(settings):
        return mock_db_client
        
    def override_get_db(settings, client):
        return test_db
    
    app.dependency_overrides[get_client] = override_get_client
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.pop(get_client, None)
    app.dependency_overrides.pop(get_db, None)
