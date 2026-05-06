import asyncio
from app.services.authentik_service import fetch_all_users
from app.core.config import Settings
import os
from dotenv import load_dotenv

load_dotenv("api-gala/.env")

async def test():
    settings = Settings()
    print("Testing fetch_all_users without search:")
    users = await fetch_all_users(settings)
    print(f"Found {len(users)} users")
    
    print("Testing fetch_all_users with search:")
    users = await fetch_all_users(settings, search="test")
    print(f"Found {len(users)} users")

if __name__ == "__main__":
    asyncio.run(test())
