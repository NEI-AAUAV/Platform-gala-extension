from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pymongo.errors import DuplicateKeyError
from app.core.db.types import DBType
from app.models.user import User, BusOption
from app.models.table import Table
from app.services.config import ConfigService
from app.services.storage import storage_client
from app.services.table import TableService
from app.utils import is_deadline_passed
import app.queries.table as table_queries

EXISTS = "$exists"

_DEADLINE_POLICY_TTL_SECONDS = 300
_deadline_policy_last_run: Optional[datetime] = None


_DISH_TYPE_ALIASES: Dict[str, str] = {
    "NOR": "NOR", "NORMAL": "NOR", "CARNE": "NOR", "MEAT": "NOR",
    "VEG": "VEG", "VEGETARIAN": "VEG", "VEGETARIANO": "VEG",
    "FISH": "FISH", "PEIXE": "FISH",
    "VEGAN": "VEGAN",
}


def _resolve_companion_dish(raw: str, config) -> Optional[str]:
    """Resolve a companion dish value (config meal ID or legacy DishType alias) to a config meal ID."""
    stripped = raw.strip()
    # Already a valid config meal ID
    if config and any(m.id == stripped for m in config.meals):
        return stripped
    # Legacy DishType alias → find the first active config meal with that dish_type
    dish_type_str = _DISH_TYPE_ALIASES.get(stripped.upper())
    if dish_type_str and config:
        for meal in config.meals:
            if meal.dish_type == dish_type_str and meal.is_active:
                return meal.id
    return None


class RegistrationService:
    @staticmethod
    def _normalize_companions_payload(companions: Any, config=None) -> list:
        if not isinstance(companions, list):
            return []
        normalized = []
        for c in companions:
            if not isinstance(c, dict):
                continue
            raw_dish = c.get("dish", c.get("meal"))
            dish = _resolve_companion_dish(raw_dish, config) if isinstance(raw_dish, str) else None
            normalized.append(
                {
                    "name": str(c.get("name", "")).strip(),
                    "dish": dish,
                    "allergies": str(c.get("allergies", "")).strip(),
                    "email": str(c.get("email", "")).strip().lower() or None,
                }
            )
        return normalized

    @staticmethod
    async def count_registered_attendees(db: DBType) -> int:
        """Counts all registered attendees for capacity enforcement.
        Every is_registered=True user holds a slot regardless of payment status.
        Companions declared on their registration profile are counted as additional seats.
        """
        result = await User.get_collection(db).aggregate([
            {"$match": {"is_registered": True}},
            {
                "$group": {
                    "_id": None,
                    "registrations": {"$sum": 1},
                    "companions": {"$sum": {"$size": {"$ifNull": ["$companions", []]}}},
                }
            },
        ]).to_list(None)

        if not result:
            return 0
        row = result[0]
        return row["registrations"] + row["companions"]

    @staticmethod
    async def count_bus_seats_taken(db: DBType, exclude_user_id: Optional[int] = None) -> int:
        """Counts bus seats occupied by all users with a non-NONE bus option.
        Each user takes 1 seat plus 1 per companion.
        Pass exclude_user_id to exclude a specific user (e.g. before re-saving their own entry).
        """
        bus_values = [o.value for o in BusOption if o != BusOption.NONE]
        match: Dict[str, Any] = {"bus_option": {"$in": bus_values}, "is_companion_of": None}
        if exclude_user_id is not None:
            match["_id"] = {"$ne": exclude_user_id}
        result = await User.get_collection(db).aggregate([
            {"$match": match},
            {"$group": {
                "_id": None,
                "total": {"$sum": {"$add": [1, {"$size": {"$ifNull": ["$companions", []]}}]}},
            }},
        ]).to_list(1)
        return result[0]["total"] if result else 0

    @staticmethod
    async def get_user_registration(db: DBType, user_id: int) -> Optional[User]:
        collection = User.get_collection(db)
        user_dict = await collection.find_one({"_id": user_id})
        if user_dict:
            return User.parse_obj(user_dict)
        return None

    @staticmethod
    async def get_or_create_user_registration(
        db: DBType, user_id: int, email: str, name: str, nmec: Optional[int]
    ) -> User:
        user = await RegistrationService.get_user_registration(db, user_id)
        if user:
            return user
        new_user = User(id=user_id, nmec=nmec or 0, email=email, name=name, registration_step=1)
        try:
            await User.get_collection(db).insert_one(new_user.dict(by_alias=True))
            return new_user
        except DuplicateKeyError:
            user = await RegistrationService.get_user_registration(db, user_id)
            if user:
                return user
            raise RuntimeError(f"Failed to create or fetch registration for user {user_id}")

    @staticmethod
    def payment_review_state(user: User, phase: int) -> str:
        confirmed = user.payment_phase1_confirmed if phase == 1 else user.payment_phase2_confirmed
        proof = user.payment_proof_url if phase == 1 else user.payment_proof_url_phase2
        if confirmed:
            return "confirmed"
        if proof:
            return "review"
        return "missing"

    @staticmethod
    async def apply_payment_deadline_policy(db: DBType) -> None:
        """Marks registrations inactive when the relevant payment deadline passed without proof."""
        global _deadline_policy_last_run
        now = datetime.now(tz=timezone.utc)
        if (
            _deadline_policy_last_run is not None
            and (now - _deadline_policy_last_run).total_seconds() < _DEADLINE_POLICY_TTL_SECONDS
        ):
            return
        _deadline_policy_last_run = now

        try:
            config = await ConfigService.get_config(db)
        except Exception:
            return
        user_coll = User.get_collection(db)

        common_set = {
            "registration_active": False,
            "payment_expired": True,
        }

        if config.payment_deadline_date and is_deadline_passed(config.payment_deadline_date):
            await user_coll.update_many(
                {
                    "is_registered": True,
                    "is_companion_of": None,
                    "registration_active": {"$ne": False},
                    "has_payed": {"$ne": True},
                    "phased_payment": {"$ne": True},
                    "$or": [
                        {"payment_proof_url": None},
                        {"payment_proof_url": {EXISTS: False}},
                    ],
                },
                {"$set": common_set},
            )

        phase1_deadline = config.prices.phase1_deadline
        if phase1_deadline and is_deadline_passed(phase1_deadline):
            # Phase 1 missed: downgrade to full (integral) payment instead of cancelling.
            # The general payment_deadline_date policy will cancel them if they still don't pay.
            await user_coll.update_many(
                {
                    "is_registered": True,
                    "is_companion_of": None,
                    "registration_active": {"$ne": False},
                    "has_payed": {"$ne": True},
                    "phased_payment": True,
                    "$or": [
                        {"payment_proof_url": None},
                        {"payment_proof_url": {EXISTS: False}},
                    ],
                },
                {"$set": {"phased_payment": False}},
            )

        phase2_deadline = config.prices.phase2_deadline
        if phase2_deadline and is_deadline_passed(phase2_deadline):
            await user_coll.update_many(
                {
                    "is_registered": True,
                    "is_companion_of": None,
                    "registration_active": {"$ne": False},
                    "has_payed": {"$ne": True},
                    "phased_payment": True,
                    "$or": [
                        {"payment_proof_url_phase2": None},
                        {"payment_proof_url_phase2": {EXISTS: False}},
                    ],
                },
                {"$set": common_set},
            )

    @staticmethod
    async def _check_tables_open(db: DBType) -> None:
        from app.models.time_slots import TimeSlots, TIME_SLOTS_ID
        from datetime import datetime, timezone
        ts_coll = TimeSlots.get_collection(db)
        ts_doc = await ts_coll.find_one({"_id": TIME_SLOTS_ID})
        ts = TimeSlots.parse_obj(ts_doc) if ts_doc else TimeSlots()

        def ensure_utc(dt: datetime) -> datetime:
            return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

        now = datetime.now(tz=timezone.utc)

        if ts.tables_start is None or ts.tables_end is None:
            raise ValueError("A escolha de mesa ainda não está aberta.")
        tables_start = ensure_utc(ts.tables_start)
        tables_end = ensure_utc(ts.tables_end)
        if now < tables_start:
            raise ValueError("A escolha de mesa ainda não está aberta.")
        if now > tables_end:
            raise ValueError("O prazo para escolha de mesa já passou.")

    @staticmethod
    async def _handle_step_5(db: DBType, user: User, user_id: int, data: Dict[str, Any]) -> None:
        table_id = data.get("table_id")
        table_name = data.get("table_name") or f"Mesa de {user.name}"

        if table_id == "new" and not user.table_id:
            await RegistrationService._check_tables_open(db)
            await TableService.create_table(db, user_id, table_name)
        elif table_id and table_id not in ("new", "none", "null", "invited"):
            target_id = int(table_id)
            if user.table_id != target_id:
                await RegistrationService._check_tables_open(db)
                table_doc = await Table.get_collection(db).find_one({"_id": target_id})
                has_invite = table_doc and user.id in (table_doc.get("invites") or [])
                if has_invite:
                    await TableService.join_via_invite(db, user, target_id)
                else:
                    await TableService.request_join_table(db, user, target_id)
        elif table_id in ("none", "null") and user.table_id:
            await TableService.leave_table(db, user_id)

    @staticmethod
    def _apply_step_data(step: int, data: Dict[str, Any], update_data: Dict[str, Any]) -> None:
        if step == 2:
            update_data["matriculation"] = data.get("matriculation")
            update_data["phone"] = data.get("phone")
            if "nmec" in data:
                update_data["nmec"] = data["nmec"]
        elif step == 3:
            update_data["bus_option"] = BusOption(data.get("bus_option", "NONE"))
            update_data["meal_option"] = data.get("meal_option")
            update_data["food_allergies"] = data.get("food_allergies")
        elif step == 4:
            if "payment_proof_url" in data:
                update_data["payment_proof_url"] = data["payment_proof_url"]
            if "phased_payment" in data:
                update_data["phased_payment"] = data["phased_payment"]
        elif step == 6:
            update_data["is_registered"] = True
            update_data["registered_at"] = datetime.now(tz=timezone.utc)

    @staticmethod
    async def update_step(db: DBType, user_id: int, step: int, data: Dict[str, Any]) -> User:
        collection = User.get_collection(db)

        user = await RegistrationService.get_user_registration(db, user_id)
        if not user:
            raise ValueError("Utilizador não encontrado. Por favor inicia sessão novamente.")

        update_data = {"registration_step": max(user.registration_step, step)}

        RegistrationService._apply_step_data(step, data, update_data)

        if step in (2, 3) and "companions" in data:
            config = await ConfigService.get_config(db)
            update_data["companions"] = RegistrationService._normalize_companions_payload(
                data["companions"], config
            )

        if step == 5:
            await RegistrationService._handle_step_5(db, user, user_id, data)

        await collection.update_one({"_id": user_id}, {"$set": update_data})

        if step in (2, 3) and "companions" in data:
            await TableService.sync_companions(db, user_id, update_data.get("companions", []))

        if step == 3 and "meal_option" in update_data:
            await TableService.sync_user_dish(db, user_id)

        if step == 3 and "food_allergies" in update_data:
            await TableService.sync_user_allergies(db, user_id)

        updated_dict = await collection.find_one({"_id": user_id})
        return User.parse_obj(updated_dict)

    @staticmethod
    async def upload_payment_proof(db: DBType, user_id: int, file_data: bytes, content_type: str, phase: int = 1) -> str:
        key = f"proofs/{user_id}_payment_proof_phase{phase}"
        url = storage_client.upload_image(key, file_data, content_type)
        if not url:
            raise RuntimeError("Failed to upload payment proof to storage.")

        field = "payment_proof_url" if phase == 1 else "payment_proof_url_phase2"
        confirmed_field = "payment_phase1_confirmed" if phase == 1 else "payment_phase2_confirmed"
        collection = User.get_collection(db)
        await collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    field: url,
                    confirmed_field: False,
                    "payment_expired": False,
                    "registration_active": True,
                }
            },
        )
        return url
