from typing import Optional, Dict, Any
from app.core.db.types import DBType
from app.models.user import User, BusOption
from app.services.config import ConfigService
from app.services.storage import storage_client
from app.utils import is_deadline_passed

EXISTS = "$exists"


class RegistrationService:
    @staticmethod
    async def get_user_registration(db: DBType, user_id: int) -> Optional[User]:
        collection = User.get_collection(db)
        user_dict = await collection.find_one({"_id": user_id})
        if user_dict:
            return User.parse_obj(user_dict)
        return None

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
            await user_coll.update_many(
                {
                    "is_registered": True,
                    "registration_active": {"$ne": False},
                    "has_payed": {"$ne": True},
                    "phased_payment": True,
                    "$or": [
                        {"payment_proof_url": None},
                        {"payment_proof_url": {EXISTS: False}},
                    ],
                },
                {"$set": common_set},
            )

        phase2_deadline = config.prices.phase2_deadline
        if phase2_deadline and is_deadline_passed(phase2_deadline):
            await user_coll.update_many(
                {
                    "is_registered": True,
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
    async def _check_table_deadline(db: DBType) -> None:
        from app.models.time_slots import TimeSlots, TIME_SLOTS_ID
        from datetime import datetime, timezone
        ts_coll = TimeSlots.get_collection(db)
        ts_doc = await ts_coll.find_one({"_id": TIME_SLOTS_ID})
        if ts_doc:
            ts = TimeSlots.parse_obj(ts_doc)
            now = datetime.now(tz=timezone.utc)
            tables_end = ts.tables_end
            if tables_end.tzinfo is None:
                tables_end = tables_end.replace(tzinfo=timezone.utc)
            if now > tables_end and tables_end.year > 1970:
                raise ValueError("O prazo para escolha de mesa já passou.")

    @staticmethod
    async def _join_table_via_invite(db: DBType, user: User, target_id: int, user_id: int) -> None:
        from app.models.table import Table, TablePerson, DishType
        if user.table_id:
            from app.services.table import TableService
            await TableService.leave_table(db, user_id)
        table_doc = await Table.get_collection(db).find_one({"_id": target_id})
        if table_doc and user_id in (table_doc.get("invites") or []):
            person = TablePerson(
                id=user_id,
                allergies=user.food_allergies or "",
                dish=DishType.NORMAL,
                confirmed=True,
                companions=user.companions,
            )
            await Table.get_collection(db).update_one(
                {"_id": target_id},
                {
                    "$push": {"persons": person.dict()},
                    "$pull": {"invites": user_id},
                },
            )
            await User.get_collection(db).update_one(
                {"_id": user_id}, {"$set": {"table_id": target_id}}
            )
        else:
            raise ValueError("Não tens convite para essa mesa.")

    @staticmethod
    async def _handle_step_5(db: DBType, user: User, user_id: int, data: Dict[str, Any]) -> None:
        if user.is_registered:
            await RegistrationService._check_table_deadline(db)

        table_id = data.get("table_id")
        table_name = data.get("table_name") or f"Mesa de {user.name}"
        from app.services.table import TableService

        if table_id == "new" and not user.table_id:
            await TableService.create_table(db, user_id, table_name)
        elif table_id and table_id not in ("none", "null", "invited"):
            target_id = int(table_id)
            if user.table_id != target_id:
                await RegistrationService._join_table_via_invite(db, user, target_id, user_id)
        elif table_id in ("none", "null"):
            if user.table_id:
                await TableService.leave_table(db, user_id)

    @staticmethod
    def _apply_step_data(step: int, data: Dict[str, Any], update_data: Dict[str, Any]) -> None:
        if step == 2:
            update_data["matriculation"] = data.get("matriculation")
            update_data["phone"] = data.get("phone")
            if "nmec" in data:
                update_data["nmec"] = data["nmec"]
            if "companions" in data:
                update_data["companions"] = data["companions"]
        elif step == 3:
            update_data["bus_option"] = BusOption(data.get("bus_option", "NONE"))
            update_data["meal_option"] = data.get("meal_option")
            update_data["food_allergies"] = data.get("food_allergies")
            if "companions" in data:
                update_data["companions"] = data["companions"]
        elif step == 4:
            if "payment_proof_url" in data:
                update_data["payment_proof_url"] = data["payment_proof_url"]
            if "phased_payment" in data:
                update_data["phased_payment"] = data["phased_payment"]
        elif step == 6:
            update_data["is_registered"] = True

    @staticmethod
    async def update_step(db: DBType, user_id: int, step: int, data: Dict[str, Any]) -> User:
        collection = User.get_collection(db)
        
        user = await RegistrationService.get_user_registration(db, user_id)
        if not user:
            raise ValueError("Utilizador não encontrado. Por favor inicia sessão novamente.")

        update_data = {"registration_step": max(user.registration_step, step)}
        
        RegistrationService._apply_step_data(step, data, update_data)

        if step == 5:
            await RegistrationService._handle_step_5(db, user, user_id, data)

        await collection.update_one({"_id": user_id}, {"$set": update_data})

        if step in (2, 3) and "companions" in data:
            await RegistrationService._sync_companions_in_table(db, user_id, data["companions"])

        updated_dict = await collection.find_one({"_id": user_id})
        return User.parse_obj(updated_dict)

    @staticmethod
    async def _sync_companions_in_table(db: DBType, user_id: int, companions: list) -> None:
        from app.models.table import Table
        user_dict = await User.get_collection(db).find_one({"_id": user_id})
        if not user_dict or not user_dict.get("table_id"):
            return
        table_id = user_dict["table_id"]
        await Table.get_collection(db).update_one(
            {"_id": table_id, "persons.id": user_id},
            {"$set": {"persons.$.companions": companions}},
        )

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
            {"$set": {field: url, confirmed_field: False, "payment_expired": False}}
        )
        return url
