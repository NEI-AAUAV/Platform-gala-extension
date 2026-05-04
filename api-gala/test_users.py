import asyncio
from app.services.authentik_service import fetch_all_users
from app.core.config import Settings
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    settings = Settings()
    print("Testing fetch_all_users without search:")
    try:
        users = await fetch_all_users(settings)
        print(f"Found {len(users)} users")
    except Exception as e:
        print(f"Error: {e}")
    
    print("Testing fetch_all_users with search:")
    try:
        users = await fetch_all_users(settings, search="test")
        print(f"Found {len(users)} users")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
