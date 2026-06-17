import time
from typing import Tuple
from app.core.db.types import DBType
from app.models.config import GlobalConfig, CONFIG_ID


_MEAL_ID_TO_DISH_TYPE: dict = {
    "fish": "FISH",
    "veg": "VEG",
    "vegetarian": "VEG",
    "vegetariano": "VEG",
    "vegan": "VEGAN",
}

# Per-process in-memory cache keyed by DB name so each database (and each
# isolated test DB) has its own entry. Each Gunicorn worker has its own copy,
# so a config change invalidates only that worker's entry until TTL expires.
# Acceptable for a short live event where config changes are rare.
_CONFIG_TTL = 300.0
_config_cache: dict[str, Tuple[float, GlobalConfig]] = {}


class ConfigService:
    @staticmethod
    async def get_config(db: DBType) -> GlobalConfig:
        now = time.monotonic()
        cache_key = db.name
        cached_entry = _config_cache.get(cache_key)
        if cached_entry is not None and now < cached_entry[0]:
            return cached_entry[1]

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
            _config_cache[cache_key] = (now + _CONFIG_TTL, default_config)
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
        _config_cache[cache_key] = (now + _CONFIG_TTL, config)
        return config

    @staticmethod
    def invalidate_cache(db: DBType) -> None:
        _config_cache.pop(db.name, None)

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
        _config_cache.pop(db.name, None)
        updated = await collection.find_one({"_id": CONFIG_ID})
        return GlobalConfig.parse_obj(updated) if updated else config
