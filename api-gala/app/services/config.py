from typing import Optional
from app.core.db.types import DBType
from app.models.config import GlobalConfig, CONFIG_ID


class ConfigService:
    @staticmethod
    async def get_config(db: DBType) -> GlobalConfig:
        collection = GlobalConfig.get_collection(db)
        config_dict = await collection.find_one({"_id": CONFIG_ID})
        
        if not config_dict:
            # Create default config if not exists
            default_config = GlobalConfig(
                dates={
                    "event_date": "2026-05-30",
                    "event_time": "20:00",
                },
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
                    {"id": "meat", "name": "Meat Option", "description": "Steak with pepper sauce", "is_active": True},
                    {"id": "fish", "name": "Fish Option", "description": "Salmon with herbs", "is_active": True},
                    {"id": "veg", "name": "Vegetarian", "description": "Mushroom risotto", "is_active": True}
                ],
                items_included=["Full dinner", "Open bar", "Live music", "Bus transport (if selected)"]
            )
            await collection.insert_one(default_config.dict(by_alias=True))
            return default_config
            
        return GlobalConfig.parse_obj(config_dict)

    @staticmethod
    async def update_config(db: DBType, config: GlobalConfig) -> GlobalConfig:
        collection = GlobalConfig.get_collection(db)
        await collection.replace_one(
            {"_id": CONFIG_ID},
            config.dict(by_alias=True),
            upsert=True
        )
        return config
