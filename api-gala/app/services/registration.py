from typing import Optional, Dict, Any
from app.core.db.types import DBType
from app.models.user import User, BusOption
from app.services.storage import storage_client


class RegistrationService:
    @staticmethod
    async def get_user_registration(db: DBType, user_id: int) -> Optional[User]:
        collection = User.get_collection(db)
        user_dict = await collection.find_one({"_id": user_id})
        if user_dict:
            return User.parse_obj(user_dict)
        return None

    @staticmethod
    async def update_step(db: DBType, user_id: int, step: int, data: Dict[str, Any]) -> User:
        collection = User.get_collection(db)
        
        # Ensure user exists or create skeleton from OIDC (handled by auth usually, but let's be safe)
        user = await RegistrationService.get_user_registration(db, user_id)
        if not user:
            # This should have been created during first login, but if not, we fail here
            # as we need base data from Authentik.
            raise ValueError("Utilizador não encontrado. Por favor inicia sessão novamente.")

        update_data = {"registration_step": max(user.registration_step, step)}
        
        if step == 2:
            # Personal data
            update_data["matriculation"] = data.get("matriculation")
            update_data["phone"] = data.get("phone")
            # nmec should be fixed, but if user can edit it:
            if "nmec" in data:
                update_data["nmec"] = data["nmec"]
            
            if "companions" in data:
                update_data["companions"] = data["companions"]

        elif step == 3:
            # Logistics
            update_data["bus_option"] = BusOption(data.get("bus_option", "NONE"))
            update_data["meal_option"] = data.get("meal_option")
            update_data["food_allergies"] = data.get("food_allergies")
            
            if "companions" in data:
                update_data["companions"] = data["companions"]

        elif step == 4:
            # Payment - proof upload is usually a separate call, but if sent here:
            if "payment_proof_url" in data:
                update_data["payment_proof_url"] = data["payment_proof_url"]
            if "phased_payment" in data:
                update_data["phased_payment"] = data["phased_payment"]

        elif step == 5:
            # Table selection — validate deadline when user is already registered
            if user.is_registered:
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

            table_id = data.get("table_id")
            table_name = data.get("table_name") or f"Mesa de {user.name}"
            from app.services.table import TableService

            if table_id == "new":
                if not user.table_id:
                    await TableService.create_table(db, user_id, table_name)
            elif table_id and table_id not in ("none", "null"):
                target_id = int(table_id)
                if user.table_id != target_id:
                    if user.table_id:
                        await TableService.leave_table(db, user_id)
                    await TableService.join_table(db, user_id, table_id=target_id)
            else:
                if user.table_id:
                    await TableService.leave_table(db, user_id)

        elif step == 6:
            # Final confirmation
            update_data["is_registered"] = True

        await collection.update_one({"_id": user_id}, {"$set": update_data})
        
        # Return updated user
        updated_dict = await collection.find_one({"_id": user_id})
        return User.parse_obj(updated_dict)

    @staticmethod
    async def upload_payment_proof(db: DBType, user_id: int, file_data: bytes, content_type: str, phase: int = 1) -> str:
        key = f"proofs/{user_id}_payment_proof_phase{phase}"
        url = storage_client.upload_image(key, file_data, content_type)
        if not url:
            raise RuntimeError("Failed to upload payment proof to storage.")

        field = "payment_proof_url" if phase == 1 else "payment_proof_url_phase2"
        collection = User.get_collection(db)
        await collection.update_one(
            {"_id": user_id},
            {"$set": {field: url}}
        )
        return url
