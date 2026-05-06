import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    client = AsyncIOMotorClient("mongodb://root:example@localhost:27017")
    db = client["gala"]
    users = await db["User"].find().to_list(None)
    print(f"Total users: {len(users)}")
    registered = await db["User"].find({"is_registered": True}).to_list(None)
    print(f"Registered users: {len(registered)}")
    for u in registered[:3]:
        print(f"User: {u.get('name')}, {u.get('email')}, _id: {u.get('_id')}")

asyncio.run(test())
