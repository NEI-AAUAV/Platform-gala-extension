from typing import Optional
from aiocache import cached
from app.core.db.types import DBType
from app.models.config import GlobalConfig, CONFIG_ID


_MEAL_ID_TO_DISH_TYPE: dict = {
    "fish": "FISH",
    "veg": "VEG",
    "vegetarian": "VEG",
    "vegetariano": "VEG",
    "vegan": "VEGAN",
}


class ConfigService:
    @staticmethod
    @cached(ttl=300)
    async def get_config(db: DBType) -> GlobalConfig:
        collection = GlobalConfig.get_collection(db)
        config_dict = await collection.find_one({"_id": CONFIG_ID})

        if not config_dict:
            # Create default config if not exists
            default_config = GlobalConfig(
                prices={
                    "total_price": 35.0,
                    "phased_payment_enabled": True,
                    "phase1_amount": 20.0,
                    "phase1_deadline": "2026-05-15",
                    "iban": "PT50 1234 5678 9012 3456 7890 1",
                    "holder": "NEI",
                },
                bus={"enabled": True, "price_round_trip": 5.0, "price_one_way": 3.0, "capacity": 50},
                meals=[
                    {"id": "meat", "name": "Meat Option", "description": "Steak with pepper sauce", "is_active": True, "dish_type": "NOR"},
                    {"id": "fish", "name": "Fish Option", "description": "Salmon with herbs", "is_active": True, "dish_type": "FISH"},
                    {"id": "veg", "name": "Vegetarian", "description": "Mushroom risotto", "is_active": True, "dish_type": "VEG"},
                ],
                items_included=["Full dinner", "Open bar", "Live music", "Bus transport (if selected)"]
            )
            await collection.insert_one(default_config.dict(by_alias=True))
            return default_config

        # One-time migration: add dish_type to meals that were stored without it.
        # Only patches meals where the field is literally absent in MongoDB.
        meals = config_dict.get("meals", [])
        migrated = False
        for meal in meals:
            if "dish_type" not in meal:
                meal["dish_type"] = _MEAL_ID_TO_DISH_TYPE.get(meal.get("id", ""), "NOR")
                migrated = True
        if migrated:
            await collection.update_one(
                {"_id": CONFIG_ID},
                {"$set": {"meals": meals}},
            )

        return GlobalConfig.parse_obj(config_dict)

    @staticmethod
    async def update_config(db: DBType, config: GlobalConfig) -> GlobalConfig:
        collection = GlobalConfig.get_collection(db)
        config_dict = config.dict(by_alias=True)
        config_dict.pop("_id", CONFIG_ID)
        await collection.update_one(
            {"_id": CONFIG_ID},
            {"$set": config_dict},
            upsert=True
        )
        # Return the full merged config
        updated = await collection.find_one({"_id": CONFIG_ID})
        return GlobalConfig.parse_obj(updated) if updated else config

