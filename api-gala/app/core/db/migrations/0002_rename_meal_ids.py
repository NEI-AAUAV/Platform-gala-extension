"""
Migration 0002: Rename meal config IDs to match their dish types.

The config was set up with IDs that no longer match the meals they hold:
  id="fish"  dish_type=VEG  → the vegetarian dish (fish was removed from menu)
  id="veg"   dish_type=VEGAN → the vegan dish

This migration corrects the IDs so they match their dish_type:
  fish  → veg    (vegetarian)
  veg   → vegan  (vegan)
  meat  → unchanged

Rename order: veg→vegan first to avoid a transient collision where both
"veg" and the renamed "fish" would momentarily share the same ID.

Step 1 — config.meals[].id: rename in the GLOBAL_CONFIG document.
Step 2 — user.meal_option: update the 5 users whose meal_option="fish"
          and any users with meal_option="veg" (currently 0).

table.persons[].dish is NOT touched — those are DishType codes (NOR/VEG),
not config IDs. They are re-derived at join time by _user_dish().
"""

from app.core.logging import logger
from app.core.db.types import DBType

name = "0002_rename_meal_ids"

_RENAMES = [
    ("veg", "vegan"),
    ("fish", "veg"),
]


async def run(db: DBType) -> None:
    await _rename_config_ids(db)
    await _rename_user_meal_options(db)


async def _rename_config_ids(db: DBType) -> None:
    config_doc = await db["config"].find_one({"_id": "GLOBAL_CONFIG"})
    if not config_doc:
        logger.warning("[0002] No GLOBAL_CONFIG document found; skipping config ID rename.")
        return

    meals = config_doc.get("meals", [])
    rename_map = dict(_RENAMES)
    new_meals = []
    changed = []

    for meal in meals:
        old_id = meal.get("id")
        new_id = rename_map.get(old_id)
        if new_id:
            new_meals.append({**meal, "id": new_id})
            changed.append(f"{old_id} → {new_id}")
        else:
            new_meals.append(meal)

    if not changed:
        logger.info("[0002] Config meal IDs already correct; no rename needed.")
        return

    await db["config"].update_one(
        {"_id": "GLOBAL_CONFIG"},
        {"$set": {"meals": new_meals}},
    )
    logger.info(f"[0002] Config meal IDs renamed: {', '.join(changed)}.")


async def _rename_user_meal_options(db: DBType) -> None:
    total = 0
    for old_id, new_id in _RENAMES:
        result = await db["user"].update_many(
            {"meal_option": old_id},
            {"$set": {"meal_option": new_id}},
        )
        if result.modified_count:
            logger.info(
                f"[0002] user.meal_option: renamed {old_id} → {new_id} "
                f"for {result.modified_count} user(s)."
            )
            total += result.modified_count

    if total == 0:
        logger.info("[0002] user.meal_option: no renames needed.")
    else:
        logger.info(f"[0002] user.meal_option: {total} user(s) updated in total.")
