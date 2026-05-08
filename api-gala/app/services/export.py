import csv
import io
from typing import List, Dict, Any
from app.core.db.types import DBType
from app.models.user import User
from app.models.table import Table


class ExportService:
    @staticmethod
    async def export_registrations(db: DBType) -> str:
        user_coll = User.get_collection(db)
        users_cursor = user_coll.find({"is_registered": True})
        users = await users_cursor.to_list(length=1000)
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "record_type", "host_id", "companion_index",
            "id", "nmec", "name", "email", "phone", "matriculation", "bus_option",
            "meal_option", "food_allergies", "phased_payment", "has_payed", "table_id"
        ])
        writer.writeheader()
        
        for user_dict in users:
            user = User.parse_obj(user_dict)
            writer.writerow({
                "record_type": "registration",
                "host_id": user.id,
                "companion_index": "",
                "id": user.id,
                "nmec": user.nmec,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "matriculation": user.matriculation.__root__ if user.matriculation else None,
                "bus_option": user.bus_option,
                "meal_option": user.meal_option,
                "food_allergies": user.food_allergies,
                "phased_payment": user.phased_payment,
                "has_payed": user.has_payed,
                "table_id": user.table_id
            })
            for i, companion in enumerate(user.companions, start=1):
                writer.writerow({
                    "record_type": "companion",
                    "host_id": user.id,
                    "companion_index": i,
                    "id": "",
                    "nmec": "",
                    "name": companion.name,
                    "email": companion.email,
                    "phone": "",
                    "matriculation": "",
                    "bus_option": user.bus_option,
                    "meal_option": companion.dish,
                    "food_allergies": companion.allergies,
                    "phased_payment": user.phased_payment,
                    "has_payed": user.has_payed,
                    "table_id": user.table_id
                })
            
        return output.getvalue()

    @staticmethod
    async def export_tables(db: DBType) -> str:
        table_coll = Table.get_collection(db)
        cursor = table_coll.find({})
        tables = await cursor.to_list(length=1000)
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "table_id", "name", "head_id", "seats", "confirmed_count", "members"
        ])
        writer.writeheader()
        
        for table_dict in tables:
            table = Table.parse_obj(table_dict)
            writer.writerow({
                "table_id": table.id,
                "name": table.name,
                "head_id": table.head,
                "seats": table.seats,
                "confirmed_count": table.confirmed_seats(),
                "members": "; ".join([str(p.id) for p in table.persons])
            })
            
        return output.getvalue()
