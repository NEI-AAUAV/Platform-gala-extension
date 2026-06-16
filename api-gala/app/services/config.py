import time
from typing import Optional, Tuple
from app.core.db.types import DBType
from app.models.config import GlobalConfig, CONFIG_ID


_MEAL_ID_TO_DISH_TYPE: dict = {
    "fish": "FISH",
    "veg": "VEG",
    "vegetarian": "VEG",
    "vegetariano": "VEG",
    "vegan": "VEGAN",
}

# Per-process in-memory cache. Each Gunicorn worker has its own copy, so a
# config change that invalidates the cache in one worker leaves other workers
# with stale data until their TTL expires. Acceptable for a short live event
# where config changes are rare and don't happen mid-event.
_CONFIG_TTL = 300.0
_config_cache: Optional[Tuple[float, GlobalConfig]] = None


class ConfigService:
    @staticmethod
    async def get_config(db: DBType) -> GlobalConfig:
        global _config_cache
        now = time.monotonic()
        if _config_cache is not None and now < _config_cache[0]:
            return _config_cache[1]

        collection = GlobalConfig.get_collection(db)
        config_dict = await collection.find_one({"_id": CONFIG_ID})

        if not config_dict:
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
            _config_cache = (now + _CONFIG_TTL, default_config)
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

        config = GlobalConfig.parse_obj(config_dict)
        _config_cache = (now + _CONFIG_TTL, config)
        return config

    @staticmethod
    async def update_config(db: DBType, config: GlobalConfig) -> GlobalConfig:
        global _config_cache
        collection = GlobalConfig.get_collection(db)
        config_dict = config.dict(by_alias=True)
        config_dict.pop("_id", CONFIG_ID)
        await collection.update_one(
            {"_id": CONFIG_ID},
            {"$set": config_dict},
            upsert=True
        )
        _config_cache = None
        updated = await collection.find_one({"_id": CONFIG_ID})
        return GlobalConfig.parse_obj(updated) if updated else config
