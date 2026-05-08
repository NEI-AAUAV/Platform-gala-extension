import secrets
import string
from typing import Optional, List
from app.core.db.types import DBType
from app.models.table import Table, TablePerson, DishType
from app.models.user import User
from app.services.storage import storage_client


class TableService:
    @staticmethod
    async def create_table(db: DBType, user_id: int, name: str, photo: Optional[bytes] = None, content_type: str = "image/png", seats: int = 10) -> Table:
        collection = Table.get_collection(db)
        user_coll = User.get_collection(db)
        
        # 1. Check if user already in table
        user_dict = await user_coll.find_one({"_id": user_id})
        user = User.parse_obj(user_dict)
        if user.table_id:
            raise ValueError("You are already in a table.")

        # 2. Upload photo if provided
        photo_url = None
        if photo:
            photo_url = storage_client.upload_image(f"tables/table_host_{user_id}", photo, content_type)

        # 3. Create table
        # We need a new ID. Using standard counter or high number for now.
        new_id = await TableService._get_next_id(db)
        
        invite_token = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        
        person = TablePerson(
            id=user_id,
            allergies=user.food_allergies or "",
            dish=DishType.NORMAL,
            confirmed=True,
            companions=user.companions,
        )

        table = Table(
            id=new_id,
            name=name,
            photo_url=photo_url,
            invite_token=invite_token,
            head=user_id,
            seats=seats,
            persons=[person]
        )

        await collection.insert_one(table.dict(by_alias=True))
        
        # 4. Update user
        await user_coll.update_one({"_id": user_id}, {"$set": {"table_id": new_id}})
        
        return table

    @staticmethod
    async def join_table(db: DBType, user_id: int, table_id: Optional[int] = None, token: Optional[str] = None) -> Table:
        collection = Table.get_collection(db)
        user_coll = User.get_collection(db)
        
        user_dict = await user_coll.find_one({"_id": user_id})
        user = User.parse_obj(user_dict)
        if user.table_id:
            raise ValueError("You are already in a table.")

        query = {}
        if table_id and token:
            # Both provided: validate that the token matches the table
            query = {"_id": table_id, "invite_token": token}
        elif table_id:
            query = {"_id": table_id}
        elif token:
            query = {"invite_token": token}
        else:
            raise ValueError("Specify table_id or token.")

        table_dict = await collection.find_one(query)
        if not table_dict:
            raise ValueError("Table not found or invalid invite token.")
            
        table = Table.parse_obj(table_dict)
        if len(table.persons) >= table.seats:
            raise ValueError("Table is full.")

        person = TablePerson(
            id=user_id,
            allergies=user.food_allergies or "",
            dish=DishType.NORMAL,
            confirmed=True,
            companions=user.companions,
        )

        update_op: dict = {"$push": {"persons": person.dict()}}
        if table.head is None:
            update_op["$set"] = {"head": user_id}

        await collection.update_one(
            {"_id": table.id},
            update_op
        )
        
        await user_coll.update_one({"_id": user_id}, {"$set": {"table_id": table.id}})
        
        # Return updated table
        updated_dict = await collection.find_one({"_id": table.id})
        return Table.parse_obj(updated_dict)

    @staticmethod
    async def leave_table(db: DBType, user_id: int) -> bool:
        user_coll = User.get_collection(db)
        table_coll = Table.get_collection(db)

        user_dict = await user_coll.find_one({"_id": user_id})
        user = User.parse_obj(user_dict)
        if not user.table_id:
            return False

        table_id = user.table_id
        
        table_dict = await table_coll.find_one({"_id": table_id})
        if not table_dict:
            await user_coll.update_one({"_id": user_id}, {"$unset": {"table_id": ""}})
            return True

        persons = table_dict.get("persons", [])
        remaining_persons = [p for p in persons if p.get("id") != user_id]

        # Keep table document valid for Mongo validators in a single atomic update.
        # Head must either be null or point to a confirmed person.
        current_head = table_dict.get("head")
        confirmed_ids = [p.get("id") for p in remaining_persons if p.get("confirmed")]
        if current_head in confirmed_ids:
            new_head = current_head
        else:
            new_head = confirmed_ids[0] if confirmed_ids else None

        update_op: dict = {
            "$pull": {"persons": {"id": user_id}},
            "$set": {"head": new_head},
        }

        await table_coll.update_one(
            {"_id": table_id},
            update_op,
            bypass_document_validation=True,
        )
        
        # 2. Update user
        await user_coll.update_one({"_id": user_id}, {"$unset": {"table_id": ""}})
        
        # 3. Clean up empty table
        updated_table_dict = await table_coll.find_one({"_id": table_id})
        if updated_table_dict and not updated_table_dict.get("persons"):
            await table_coll.delete_one({"_id": table_id})

        return True

    @staticmethod
    async def _get_next_id(db: DBType) -> int:
        from app.core.db.counters import get_next_table_id
        return await get_next_table_id(db)
