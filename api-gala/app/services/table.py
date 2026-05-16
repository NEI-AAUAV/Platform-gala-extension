from typing import Optional, List
from app.core.db.types import DBType
from app.models.table import Table, TablePerson, DishType
from app.models.user import User
from app.services.storage import storage_client
from app.utils import generate_invite_token
from pymongo import ReturnDocument

PERSONS_ID_FIELD = "persons.id"


async def _user_dish(user: User, db: DBType) -> DishType:
    if not user.meal_option:
        return DishType.NORMAL
    try:
        from app.services.config import ConfigService
        config = await ConfigService.get_config(db)
        for meal in config.meals:
            if meal.id == user.meal_option:
                dish_map = {
                    "FISH": DishType.FISH,
                    "VEG": DishType.VEGETARIAN,
                    "VEGAN": DishType.VEGAN,
                }
                return dish_map.get(meal.dish_type, DishType.NORMAL)
    except Exception:
        pass
    return DishType.NORMAL


class TableService:
    @staticmethod
    async def create_table(db: DBType, user_id: int, name: str, photo: Optional[bytes] = None, content_type: str = "image/png", seats: int = 10) -> Table:
        collection = Table.get_collection(db)
        user_coll = User.get_collection(db)
        
        # 1. Check if user already in table
        user_dict = await user_coll.find_one({"_id": user_id})
        if not user_dict:
            raise ValueError("User must complete registration before creating a table.")
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
        
        invite_token = generate_invite_token()
        
        person = TablePerson(
            id=user_id,
            allergies=user.food_allergies or "",
            dish=await _user_dish(user, db),
            confirmed=True,
            companions=user.companions,
        )

        table = Table(
            id=new_id,
            name=name,
            photo_url=photo_url,
            invite_token=invite_token,
            owner_id=user_id,
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
        if not user_dict:
            raise ValueError("User must complete registration before joining a table.")
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
        occupied = sum(1 + len(p.companions) for p in table.persons)
        needed = 1 + len(user.companions)
        if occupied + needed > table.seats:
            raise ValueError("Table is full.")

        person = TablePerson(
            id=user_id,
            allergies=user.food_allergies or "",
            dish=await _user_dish(user, db),
            confirmed=True,
            companions=user.companions,
        )

        update_op: dict = {"$push": {"persons": person.dict()}}
        if table.head is None:
            update_op["$set"] = {"head": user_id}

        updated_dict = await collection.find_one_and_update(
            {
                "_id": table.id,
                PERSONS_ID_FIELD: {"$ne": user_id},
                "$expr": {
                    "$lte": [
                        {
                            "$add": [
                                needed,
                                {
                                    "$sum": {
                                        "$map": {
                                            "input": "$persons",
                                            "as": "p",
                                            "in": {"$add": [1, {"$size": "$$p.companions"}]},
                                        }
                                    }
                                },
                            ]
                        },
                        "$seats",
                    ]
                },
            },
            update_op,
            return_document=ReturnDocument.AFTER,
        )
        if not updated_dict:
            raise ValueError("Table is full.")
        
        await user_coll.update_one({"_id": user_id}, {"$set": {"table_id": table.id}})

        # Return updated table
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

        update_op: dict = {"$pull": {"persons": {"id": user_id}}}
        if remaining_persons:
            update_op["$set"] = {"head": new_head}

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
    async def join_via_invite(db: DBType, user: User, target_id: int) -> None:
        if user.table_id:
            await TableService.leave_table(db, user.id)
        table_doc = await Table.get_collection(db).find_one({"_id": target_id})
        if not (table_doc and user.id in (table_doc.get("invites") or [])):
            raise ValueError("Não tens convite para essa mesa.")
        needed = 1 + len(user.companions)
        person = TablePerson(
            id=user.id,
            allergies=user.food_allergies or "",
            dish=await _user_dish(user, db),
            confirmed=True,
            companions=user.companions,
        )
        updated = await Table.get_collection(db).find_one_and_update(
            {
                "_id": target_id,
                "invites": user.id,
                PERSONS_ID_FIELD: {"$ne": user.id},
                "$expr": {
                    "$lte": [
                        {
                            "$add": [
                                needed,
                                {
                                    "$sum": {
                                        "$map": {
                                            "input": "$persons",
                                            "as": "p",
                                            "in": {"$add": [1, {"$size": "$$p.companions"}]},
                                        }
                                    }
                                },
                            ]
                        },
                        "$seats",
                    ]
                },
            },
            {"$push": {"persons": person.dict()}, "$pull": {"invites": user.id}},
            return_document=ReturnDocument.AFTER,
        )
        if not updated:
            raise ValueError("Mesa cheia ou convite inválido.")
        await User.get_collection(db).update_one(
            {"_id": user.id}, {"$set": {"table_id": target_id}}
        )

    @staticmethod
    async def request_join_table(db: DBType, user: User, target_id: int) -> None:
        """Add user as an unconfirmed (pending) member — owner must accept."""
        if user.table_id:
            await TableService.leave_table(db, user.id)
        table_doc = await Table.get_collection(db).find_one({"_id": target_id})
        if not table_doc:
            raise ValueError("Mesa não encontrada.")
        table = Table.parse_obj(table_doc)
        if any(p.id == user.id for p in table.persons):
            raise ValueError("Já estás nessa mesa.")
        occupied = sum(1 + len(p.companions) for p in table.persons)
        needed = 1 + len(user.companions)
        if occupied + needed > table.seats:
            raise ValueError("Mesa cheia.")
        person = TablePerson(
            id=user.id,
            allergies=user.food_allergies or "",
            dish=await _user_dish(user, db),
            confirmed=False,
            companions=user.companions,
        )
        await Table.get_collection(db).update_one(
            {"_id": target_id},
            {"$push": {"persons": person.dict()}},
        )
        await User.get_collection(db).update_one(
            {"_id": user.id}, {"$set": {"table_id": target_id}}
        )

    @staticmethod
    async def sync_companions(db: DBType, user_id: int, companions: list) -> None:
        user_dict = await User.get_collection(db).find_one({"_id": user_id})
        if not user_dict or not user_dict.get("table_id"):
            return
        table_id = user_dict["table_id"]
        await Table.get_collection(db).update_one(
            {"_id": table_id, PERSONS_ID_FIELD: user_id},
            {"$set": {"persons.$.companions": companions}},
        )

    @staticmethod
    async def create_empty_table(db: DBType, name: str, seats: int) -> Table:
        new_id = await TableService._get_next_id(db)
        table = Table(
            id=new_id,
            name=name,
            photo_url=None,
            invite_token=generate_invite_token(),
            head=None,
            seats=seats,
            persons=[],
        )
        await Table.get_collection(db).insert_one(table.dict(by_alias=True))
        return table

    @staticmethod
    async def delete_table(db: DBType, table_id: int) -> bool:
        collection = Table.get_collection(db)
        if not await collection.find_one({"_id": table_id}):
            return False
        await User.get_collection(db).update_many(
            {"table_id": table_id}, {"$unset": {"table_id": ""}}
        )
        await collection.delete_one({"_id": table_id})
        return True

    @staticmethod
    async def _get_next_id(db: DBType) -> int:
        from app.core.db.counters import get_next_table_id
        return await get_next_table_id(db)
