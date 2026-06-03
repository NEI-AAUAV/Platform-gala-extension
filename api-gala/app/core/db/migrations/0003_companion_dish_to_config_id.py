"""
Migration 0003: Convert companion dish storage from DishType codes to config meal IDs.

Depends on 0002_rename_meal_ids having run first — by the time this migration
executes, config IDs are: meat(NOR) · veg(VEG) · vegan(VEGAN).

Two fields hold legacy DishType codes that need converting:
  - user.companions[].dish       e.g. "NOR", "FISH", "VEG", "VEGAN"
  - table.persons[].companions[].dish  (synced cache, same values)

After this migration both fields store config meal IDs, consistent with
how user.meal_option has always worked.

table.persons[].dish (for the main registered person) is NOT touched —
it stores DishType codes written by _user_dish() at join time and is
semantically correct as-is.

Step 1 – FISH → VEG pre-correction.
  One companion (Isabel Rebolo) was entered with dish="FISH" from an older
  system when fish was a real menu option. That option no longer exists.
  Correcting to "VEG" before the config-ID conversion maps it to "veg"
  (vegetarian), the appropriate fallback.

Step 2 – Convert DishType values to config meal IDs.
  Reads the live config to build the DishType→configID mapping.
  Falls back to hardcoded IDs if the config has no active meal for a type.

Step 3 – Report null dish companions (NOT auto-fixed).
"""

from app.core.logging import logger
from app.core.db.types import DBType

name = "0003_companion_dish_to_config_id"

_DISH_TYPE_STRINGS = {"NOR", "FISH", "VEG", "VEGAN"}

# Fallbacks after 0002 rename: meat(NOR), veg(VEG), vegan(VEGAN), no fish option.
_FALLBACK_CONFIG_IDS = {
    "NOR": "meat",
    "FISH": "veg",
    "VEG": "veg",
    "VEGAN": "vegan",
}


async def run(db: DBType) -> None:
    dish_map = await _build_dish_type_map(db)
    await _fix_fish_to_veg(db)
    await _convert_user_companion_dishes(db, dish_map)
    await _convert_table_companion_dishes(db, dish_map)
    await _report_null_dishes(db)


async def _build_dish_type_map(db: DBType) -> dict:
    config_doc = await db["config"].find_one({"_id": "GLOBAL_CONFIG"})
    meals = config_doc.get("meals", []) if config_doc else []

    mapping: dict = {}
    for meal in meals:
        dt = str(meal.get("dish_type", "NOR")).strip().upper()
        if dt in _DISH_TYPE_STRINGS and dt not in mapping and meal.get("is_active", True):
            mapping[dt] = meal["id"]

    for dt, fallback in _FALLBACK_CONFIG_IDS.items():
        if dt not in mapping:
            mapping[dt] = fallback
            logger.warning(
                f"[0003] No active config meal for dish_type='{dt}'; using fallback '{fallback}'."
            )

    logger.info(f"[0003] DishType → config ID mapping: {mapping}")
    return mapping


async def _fix_fish_to_veg(db: DBType) -> None:
    fish_in_users = await db["user"].count_documents(
        {"companions": {"$elemMatch": {"dish": "FISH"}}}
    )
    fish_in_tables = await db["table"].count_documents(
        {"persons": {"$elemMatch": {"companions": {"$elemMatch": {"dish": "FISH"}}}}}
    )

    if fish_in_users == 0 and fish_in_tables == 0:
        logger.info("[0003] No FISH companions found; pre-correction not needed.")
        return

    if fish_in_users > 1 or fish_in_tables > 1:
        logger.warning(
            f"[0003] Expected at most 1 FISH companion per collection but found "
            f"{fish_in_users} in 'user' and {fish_in_tables} in 'table'. "
            "Skipping FISH→VEG correction — manual review required."
        )
        return

    if fish_in_users == 1:
        result = await db["user"].update_one(
            {"companions": {"$elemMatch": {"dish": "FISH"}}},
            {"$set": {"companions.$.dish": "VEG"}},
        )
        logger.info(
            f"[0003] user: corrected 1 companion FISH→VEG "
            f"(matched={result.matched_count}, modified={result.modified_count})."
        )

    if fish_in_tables == 1:
        result = await db["table"].update_one(
            {"persons": {"$elemMatch": {"companions": {"$elemMatch": {"dish": "FISH"}}}}},
            {"$set": {"persons.$[].companions.$[c].dish": "VEG"}},
            array_filters=[{"c.dish": "FISH"}],
        )
        logger.info(
            f"[0003] table: corrected 1 companion FISH→VEG "
            f"(matched={result.matched_count}, modified={result.modified_count})."
        )


async def _convert_user_companion_dishes(db: DBType, dish_map: dict) -> None:
    total_users = 0
    total_companions = 0

    async for user_doc in db["user"].find({"companions.0": {"$exists": True}}):
        companions = user_doc.get("companions", [])
        new_companions = []
        changed = False
        for comp in companions:
            raw = comp.get("dish")
            if raw in _DISH_TYPE_STRINGS:
                comp = {**comp, "dish": dish_map.get(raw, raw)}
                changed = True
                total_companions += 1
            new_companions.append(comp)
        if changed:
            await db["user"].update_one(
                {"_id": user_doc["_id"]},
                {"$set": {"companions": new_companions}},
            )
            total_users += 1

    logger.info(
        f"[0003] user: converted {total_companions} companion dish value(s) "
        f"across {total_users} user document(s)."
    )


async def _convert_table_companion_dishes(db: DBType, dish_map: dict) -> None:
    total_tables = 0
    total_companions = 0

    async for table_doc in db["table"].find({"persons.0": {"$exists": True}}):
        persons = table_doc.get("persons", [])
        new_persons = []
        changed = False
        for person in persons:
            new_companions = []
            for comp in person.get("companions", []):
                raw = comp.get("dish")
                if raw in _DISH_TYPE_STRINGS:
                    comp = {**comp, "dish": dish_map.get(raw, raw)}
                    changed = True
                    total_companions += 1
                new_companions.append(comp)
            new_persons.append({**person, "companions": new_companions})
        if changed:
            await db["table"].update_one(
                {"_id": table_doc["_id"]},
                {"$set": {"persons": new_persons}},
            )
            total_tables += 1

    logger.info(
        f"[0003] table: converted {total_companions} companion dish value(s) "
        f"across {total_tables} table document(s)."
    )


async def _report_null_dishes(db: DBType) -> None:
    null_in_users = await db["user"].count_documents(
        {"companions": {"$elemMatch": {"dish": None}}}
    )
    null_in_tables = await db["table"].count_documents(
        {"persons": {"$elemMatch": {"companions": {"$elemMatch": {"dish": None}}}}}
    )
    total = null_in_users + null_in_tables

    if total == 0:
        logger.info("[0003] No companions with null dish found.")
        return

    logger.warning(
        f"[0003] DATA GAP — {total} document(s) contain companions with null dish "
        f"({null_in_users} in 'user', {null_in_tables} in 'table'). "
        "NOT auto-fixed. Inspect with:"
    )
    logger.warning(
        'db.user.find({ "companions": { $elemMatch: { "dish": null } } }, '
        '{ "name": 1, "email": 1, "companions": 1 })'
    )
    logger.warning(
        'db.table.find('
        '{ "persons": { $elemMatch: { "companions": { $elemMatch: { "dish": null } } } } },'
        '{ "persons.companions": 1 })'
    )
