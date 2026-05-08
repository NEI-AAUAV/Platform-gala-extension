import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, Response, HTTPException, UploadFile, File, status, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, EmailStr
from typing import List, Annotated, Optional, Dict, Any, Union
from app.api.auth import api_nei_auth, ScopeEnum, AuthData, auth_responses
from app.services.storage import storage_client
from app.services.authentik_service import fetch_all_users, AuthentikUser
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.db.counters import get_next_id
from app.core.email import send_email
from app.models.config import GlobalConfig
from app.models.user import User, BusOption, Matriculation
from app.models.table import Companion
from app.models.manager_permissions import ManagerPermission
from app.services.config import ConfigService
from app.services.export import ExportService
from app.services.admin_vote import AdminVoteService
from app.services.manager_permissions import ManagerPermissionsService
from app.services.registration import RegistrationService
from app.services.table import TableService
from app.api.admin.tables import router as tables_router
from app.models.vote import VoteCategory
from app.models.time_slots import TimeSlots, TIME_SLOTS_ID


router = APIRouter()
router.include_router(tables_router)

ERROR_FORBIDDEN = "Not enough permissions"
ERROR_USER_NOT_FOUND = "User not found"


@router.get("/config", response_model=GlobalConfig, responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}})
async def get_config(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Retrieves the global event configuration (Admin/Manager only)."""
    await ManagerPermissionsService.require_config_access(db, auth)
    return await ConfigService.get_config(db)


@router.put("/config", response_model=GlobalConfig, responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}})
async def update_config(
    config: GlobalConfig,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Updates the global event configuration (Admin/Manager only)."""
    await ManagerPermissionsService.require_config_access(db, auth)
    return await ConfigService.update_config(db, config)


@router.get(
    "/export/registrations",
    response_class=PlainTextResponse,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
)
async def export_registrations(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Exports all registered users to CSV."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    csv_data = await ExportService.export_registrations(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registrations.csv"}
    )


@router.get(
    "/export/tables",
    response_class=PlainTextResponse,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
)
async def export_tables(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Exports all tables to CSV."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.TABLES)
    csv_data = await ExportService.export_tables(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tables.csv"}
    )


@router.post(
    "/registrations/{user_id}/confirm_payment",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def confirm_payment(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
    phase: Annotated[Optional[int], Query(ge=1, le=2)] = None,
):
    """Manually confirms payment for a user, either by phase or as a full payment."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

    user_coll = User.get_collection(db)
    current = await user_coll.find_one({"_id": user_id})
    if not current:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    current_user = User.parse_obj(current)
    update_data: Dict[str, Any] = {
        "registration_active": True,
        "payment_expired": False,
    }
    if phase is None:
        update_data["payment_phase1_confirmed"] = True
        update_data["payment_phase2_confirmed"] = current_user.phased_payment
        update_data["has_payed"] = True
    elif phase == 1:
        update_data["payment_phase1_confirmed"] = True
        update_data["has_payed"] = (
            current_user.payment_phase2_confirmed if current_user.phased_payment else True
        )
    else:
        update_data["payment_phase2_confirmed"] = True
        update_data["has_payed"] = (
            current_user.payment_phase1_confirmed if current_user.phased_payment else True
        )

    user_dict = await user_coll.find_one_and_update(
        {"_id": user_id},
        {"$set": update_data},
        return_document=True,
    )
    if user_dict is None:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    user = User.parse_obj(user_dict)
    
    config = await ConfigService.get_config(db)
    if user.has_payed and config.email_notifications.payment_confirmed:
        background_tasks.add_task(
            send_email,
            user.email,
            "Pagamento confirmado — Jantar de Gala",
            settings=settings,
            template="payment_confirmed",
            name=user.name,
            nmec=user.nmec,
            phased_payment=user.phased_payment,
        )

    return {"status": "success"}


@router.post(
    "/registrations/{user_id}/payment-reminder",
    responses={**auth_responses, 400: {"description": "Payment already confirmed"}, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def send_payment_reminder(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
):
    """Sends a missing payment reminder email."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    user = User.parse_obj(user_dict)
    if user.has_payed:
        raise HTTPException(status_code=400, detail="Payment already confirmed")

    config = await ConfigService.get_config(db)
    background_tasks.add_task(
        send_email,
        user.email,
        "Lembrete de pagamento — Jantar de Gala",
        settings=settings,
        template="payment_reminder",
        name=user.name,
        nmec=user.nmec,
        phased_payment=user.phased_payment,
        payment_deadline=config.payment_deadline_date,
        phase1_deadline=config.prices.phase1_deadline,
        phase2_deadline=config.prices.phase2_deadline,
    )
    await user_coll.update_one({"_id": user_id}, {"$set": {"payment_reminder_sent": True}})

    return {"status": "success"}


@router.delete(
    "/registrations/{user_id}/payment-proof",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def reject_payment_proof(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
    phase: Annotated[int, Query(ge=1, le=2)] = 1,
):
    """Rejects (deletes) payment proof for a user."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

    user_coll = User.get_collection(db)
    field = "payment_proof_url" if phase == 1 else "payment_proof_url_phase2"
    confirmed_field = "payment_phase1_confirmed" if phase == 1 else "payment_phase2_confirmed"

    current = await user_coll.find_one({"_id": user_id})
    if not current:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)
    current_user = User.parse_obj(current)

    # Rejecting phase 2 on a non-phased user must not clear has_payed (phase 1 remains valid)
    new_has_payed = False if (phase == 1 or current_user.phased_payment) else current_user.has_payed

    user_dict = await user_coll.find_one_and_update(
        {"_id": user_id},
        {"$set": {"has_payed": new_has_payed, field: None, confirmed_field: False}},
        return_document=True,
    )
    if not user_dict:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    user = User.parse_obj(user_dict)
    
    config = await ConfigService.get_config(db)
    if config.email_notifications.payment_rejected:
        background_tasks.add_task(
            send_email,
            user.email,
            "Comprovativo de Pagamento Rejeitado — Jantar de Gala",
            settings=settings,
            template="payment_rejected",
            name=user.name,
            nmec=user.nmec,
            phase=phase,
        )

    return {"status": "success"}


@router.post(
    "/registrations/{user_id}/payment-proof",
    response_model=Dict[str, str],
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}, 400: {"description": "Bad Request"}}
)
async def admin_upload_payment_proof(
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    file: Annotated[UploadFile, File(...)],
    phase: Annotated[int, Query(ge=1, le=2)] = 1,
):
    """Admin uploads a payment proof file to R2 storage."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    
    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    file_data = await file.read()
    MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
    if len(file_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )

    if not file.content_type.startswith("image/") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only images and PDFs are allowed."
        )

    url = await RegistrationService.upload_payment_proof(db, user_id, file_data, file.content_type, phase)
    return {"url": url}


@router.get(
    "/registrations/{user_id}",
    response_model=User,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def get_registration(
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Retrieves registration data for a specific user."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)
    return User.parse_obj(user_dict)


@router.patch(
    "/registrations/{user_id}",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def update_registration_admin(
    user_id: int,
    updates: Dict[str, Any],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Manually updates registration data for a specific user."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    user_coll = User.get_collection(db)
    result = await user_coll.update_one({"_id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)
    return {"status": "success"}


@router.get(
    "/registrations",
    response_model=List[User],
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
)
async def list_registrations(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Lists all registered users (including admin-created ones)."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    await RegistrationService.apply_payment_deadline_policy(db)
    user_coll = User.get_collection(db)
    # Include admin-created registrations even when is_registered may be True by design
    cursor = user_coll.find({"is_registered": True})
    users = await cursor.to_list(length=1000)
    return [User.parse_obj(u) for u in users]


# ─── Admin Registration Management ───────────────────────────────────────────

class AdminCompanionInput(BaseModel):
    name: str
    dish: Optional[str] = None
    allergies: str = ""
    email: Optional[str] = None


class AdminCreateRegistrationBody(BaseModel):
    """Body for admin-created registrations.
    
    Either authentik_user_id (for existing Authentik users) or
    name + email (for people without an account) must be provided.
    """
    # For an existing Authentik user
    authentik_user_id: Optional[int] = None

    # For a person without an Authentik account yet
    name: Optional[str] = None
    email: Optional[str] = None

    # Registration fields
    nmec: int = 0
    matriculation: Optional[int] = None  # 1-5
    phone: Optional[str] = None
    bus_option: str = "NONE"
    meal_option: Optional[str] = None
    food_allergies: Optional[str] = None
    phased_payment: bool = False
    companions: List[AdminCompanionInput] = []


class AdminEditRegistrationBody(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    nmec: Optional[int] = None
    matriculation: Optional[int] = None
    phone: Optional[str] = None
    bus_option: Optional[str] = None
    meal_option: Optional[str] = None
    food_allergies: Optional[str] = None
    phased_payment: Optional[bool] = None
    has_payed: Optional[bool] = None
    companions: Optional[List[AdminCompanionInput]] = None


@router.get(
    "/authentik/users",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
)
async def list_authentik_users(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
    query: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Lists all Authentik users for admin registration search."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    users = await fetch_all_users(settings, search=query)
    return [{"id": u.pk, "name": u.name, "email": u.email} for u in users]


async def _create_from_authentik(body: AdminCreateRegistrationBody, settings: SettingsDep, user_coll) -> User:
    # Check if already registered
    existing = await user_coll.find_one({"_id": body.authentik_user_id, "is_registered": True})
    if existing:
        raise HTTPException(status_code=409, detail="User already has a registration")

    # Look up user details from Authentik
    from app.services.authentik_service import fetch_user_by_id
    au = await fetch_user_by_id(settings, body.authentik_user_id)
    if not au:
        raise HTTPException(status_code=404, detail="Authentik user not found")

    user_name = au.name
    user_email = au.email
    user_db_id = body.authentik_user_id

    # Upsert: the user may already have a skeleton doc from logging in
    user_dict = await user_coll.find_one({"_id": user_db_id})
    mat = Matriculation(__root__=body.matriculation) if body.matriculation else None
    companions = [
        Companion(
            name=c.name,
            dish=c.dish,
            allergies=c.allergies,
            email=c.email,
        ).dict()
        for c in body.companions
    ]
    companion_emails = [c.email for c in body.companions if c.email]

    update_data = {
        "name": user_name,
        "email": user_email,
        "nmec": body.nmec,
        "matriculation": mat.dict() if mat else None,
        "phone": body.phone,
        "bus_option": body.bus_option,
        "meal_option": body.meal_option,
        "food_allergies": body.food_allergies,
        "phased_payment": body.phased_payment,
        "companions": companions,
        "companion_emails": companion_emails,
        "is_registered": True,
        "registration_step": 7,
        "admin_created": False,
        "registration_active": True,
        "payment_expired": False,
    }

    if user_dict:
        await user_coll.update_one({"_id": user_db_id}, {"$set": update_data})
    else:
        doc = {"_id": user_db_id, **update_data}
        await user_coll.insert_one(doc)

    result = await user_coll.find_one({"_id": user_db_id})
    return User.parse_obj(result)

async def _create_from_scratch(body: AdminCreateRegistrationBody, db: DBType, user_coll) -> User:
    if not body.name or not body.email:
        raise HTTPException(
            status_code=400,
            detail="name and email are required when no authentik_user_id is given"
        )

    email_lower = body.email.strip().lower()

    # Check if there's already a registration with this email
    existing = await user_coll.find_one({"email": email_lower, "is_registered": True})
    if existing:
        raise HTTPException(status_code=409, detail="A registration with this email already exists")

    new_id = await get_next_id(db, "user")
    mat = Matriculation(__root__=body.matriculation) if body.matriculation else None
    companions = [
        Companion(
            name=c.name,
            dish=c.dish,
            allergies=c.allergies,
            email=c.email,
        ).dict()
        for c in body.companions
    ]
    companion_emails = [c.email for c in body.companions if c.email]

    doc = {
        "_id": new_id,
        "name": body.name.strip(),
        "email": email_lower,
        "nmec": body.nmec,
        "matriculation": mat.dict() if mat else None,
        "phone": body.phone,
        "bus_option": body.bus_option,
        "meal_option": body.meal_option,
        "food_allergies": body.food_allergies,
        "phased_payment": body.phased_payment,
        "companions": companions,
        "companion_emails": companion_emails,
        "is_registered": True,
        "registration_step": 7,
        "admin_created": True,
        "has_payed": False,
        "payment_phase1_confirmed": False,
        "payment_phase2_confirmed": False,
        "payment_expired": False,
        "payment_reminder_sent": False,
        "registration_active": True,
        "table_id": None,
        "bus_assignment": None,
        "payment_proof_url": None,
        "payment_proof_url_phase2": None,
    }
    await user_coll.insert_one(doc)
    result = await user_coll.find_one({"_id": new_id})
    return User.parse_obj(result)

@router.post(
    "/registrations",
    response_model=User,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 409: {"description": "Already registered"}, 404: {"description": "Not Found"}, 400: {"description": "Bad Request"}}
)
async def admin_create_registration(
    body: AdminCreateRegistrationBody,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
):
    """Admin creates a registration for a person (with or without an Authentik account)."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

    user_coll = User.get_collection(db)

    if body.authentik_user_id is not None:
        user = await _create_from_authentik(body, settings, user_coll)
    else:
        user = await _create_from_scratch(body, db, user_coll)

    # Send notification
    config = await ConfigService.get_config(db)
    if config.email_notifications.registration_confirmed:
        bus_labels = {"ROUND_TRIP": "Autocarro (Ida e Volta)", "ONE_WAY": "Autocarro (Apenas Ida)", "NONE": "Deslocação própria"}
        year_label = f"{user.matriculation.__root__}º Ano" if user.matriculation else "Alumni / Outro"
        
        background_tasks.add_task(
            send_email,
            user.email,
            "Inscrição no Jantar de Gala confirmada (Admin)",
            settings=settings,
            template="registered",
            name=user.name,
            nmec=user.nmec,
            year=year_label,
            bus=bus_labels.get(user.bus_option.value, "—"),
            meal=user.meal_option or "—",
            allergies=user.food_allergies or "Nenhuma",
            phone=user.phone or "—",
            phased_payment=user.phased_payment,
            companions=user.companions,
        )

    return user


def _prepare_update_data(body: AdminEditRegistrationBody, user_dict: Dict[str, Any]) -> Dict[str, Any]:
    update_data: Dict[str, Any] = {}
    for field in ["name", "email", "nmec", "phone", "bus_option", "meal_option", "food_allergies", "phased_payment"]:
        if (val := getattr(body, field)) is not None:
            if field == "name": val = val.strip()
            elif field == "email": val = val.strip().lower()
            update_data[field] = val

    if body.matriculation == 0:
        update_data["matriculation"] = None
    elif body.matriculation is not None:
        update_data["matriculation"] = Matriculation(__root__=body.matriculation).dict()

    if body.has_payed is not None:
        update_data.update({
            "has_payed": body.has_payed,
            "payment_phase1_confirmed": body.has_payed,
            "payment_phase2_confirmed": body.has_payed if user_dict.get("phased_payment") else False
        })
        if body.has_payed:
            update_data.update({"registration_active": True, "payment_expired": False})

    if body.companions is not None:
        update_data["companions"] = [Companion.parse_obj(c).dict() for c in body.companions]
        update_data["companion_emails"] = [c.email for c in body.companions if c.email]

    return update_data


@router.put(
    "/registrations/{user_id}",
    response_model=User,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def admin_edit_registration(
    user_id: int,
    body: AdminEditRegistrationBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Admin fully edits a registration."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    update_data = _prepare_update_data(body, user_dict)

    if update_data:
        await user_coll.update_one({"_id": user_id}, {"$set": update_data})

    result = await user_coll.find_one({"_id": user_id})
    return User.parse_obj(result)


@router.delete(
    "/registrations/{user_id}",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def admin_delete_registration(
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Admin deletes a registration. For admin-created records the entire document is removed;
    for real Authentik users the registration fields are cleared but the user doc is kept.
    """
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)

    # 1. Leave table if in one
    await TableService.leave_table(db, user_id)

    # 2. If the user was a companion of someone, remove that link to prevent auto-syncing back
    user_email = user_dict.get("email")
    if user_email:
        await user_coll.update_many(
            {"companions.email": user_email},
            {"$pull": {"companions": {"email": user_email}}}
        )

    if user_dict.get("admin_created", False):
        # Completely remove the phantom record
        await user_coll.delete_one({"_id": user_id})
    else:
        # Reset registration fields, keep the user document
        await user_coll.update_one(
            {"_id": user_id},
            {"$set": {
                "is_registered": False,
                "registration_step": 1,
                "nmec": 0,
                "matriculation": None,
                "has_payed": False,
                "payment_phase1_confirmed": False,
                "payment_phase2_confirmed": False,
                "payment_expired": False,
                "payment_reminder_sent": False,
                "registration_active": True,
                "payment_proof_url": None,
                "payment_proof_url_phase2": None,
                "companions": [],
                "companion_emails": [],
                "bus_option": "NONE",
                "meal_option": None,
                "food_allergies": None,
                "table_id": None,
                "bus_assignment": None,
                "is_companion_of": None,
            }}
        )

    return {"status": "success"}


class MergeNomineesBody(BaseModel):
    target_name: str
    source_names: List[str]


@router.post(
    "/voting/categories/{category_id}/merge",
    responses={
        **auth_responses,
        400: {"description": "Merge failed"},
        403: {"description": ERROR_FORBIDDEN}
    }
)
async def admin_merge_nominees(
    category_id: int,
    body: MergeNomineesBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Merges multiple nominee names into one target name."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.CATEGORIES)
    success = await AdminVoteService.merge_nominees(db, category_id, body.target_name, body.source_names)
    if not success:
        raise HTTPException(status_code=400, detail="Merge failed")
    return {"status": "success"}


@router.post(
    "/voting/categories/{category_id}/finalize",
    responses={
        **auth_responses,
        400: {"description": "Finalization failed"},
        403: {"description": ERROR_FORBIDDEN}
    }
)
async def admin_finalize_nominations(
    category_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Finalizes nominations for a category, selecting the top 4."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.CATEGORIES)
    success = await AdminVoteService.finalize_nominations(db, category_id)
    if not success:
        raise HTTPException(status_code=400, detail="Finalization failed")
    return {"status": "success"}


class ToggleCategoryBody(BaseModel):
    nomination_open: Optional[bool] = None
    voting_open: Optional[bool] = None
    results_visible: Optional[bool] = None


@router.patch(
    "/categories/{category_id}/status",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
)
async def admin_toggle_vote_category(
    category_id: int,
    body: ToggleCategoryBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Toggles various phases of a vote category."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.CATEGORIES)

    update_data = {}
    if body.nomination_open is not None:
        update_data["nomination_open"] = body.nomination_open
    if body.voting_open is not None:
        update_data["voting_open"] = body.voting_open
    if body.results_visible is not None:
        update_data["results_visible"] = body.results_visible

    if not update_data:
        return {"status": "no change"}

    collection = VoteCategory.get_collection(db)
    await collection.update_one({"_id": category_id}, {"$set": update_data})
    return {"status": "success"}


@router.get(
    "/time",
    response_model=TimeSlots,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "Time slots not found"}}
)
async def get_time_slots(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Retrieves the event time slots."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    collection = TimeSlots.get_collection(db)
    result = await collection.find_one({"_id": TIME_SLOTS_ID})
    if not result:
        raise HTTPException(status_code=404, detail="Time slots not found")
    return TimeSlots.parse_obj(result)


@router.patch(
    "/time",
    response_model=TimeSlots,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "Time slots not found"}}
)
async def update_time_slots(
    updates: Dict[str, Any],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Updates the event time slots."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
    collection = TimeSlots.get_collection(db)
    await collection.update_one({"_id": TIME_SLOTS_ID}, {"$set": updates})
    result = await collection.find_one({"_id": TIME_SLOTS_ID})
    return TimeSlots.parse_obj(result)


class BusAssignBody(BaseModel):
    bus_id: Optional[str] = None


@router.patch(
    "/registrations/{user_id}/bus",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": ERROR_USER_NOT_FOUND}}
)
async def assign_bus(
    user_id: int,
    body: BusAssignBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Assigns (or unassigns) a user to a specific bus."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.BUSES)
    user_coll = User.get_collection(db)
    result = await user_coll.update_one({"_id": user_id}, {"$set": {"bus_assignment": body.bus_id}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=ERROR_USER_NOT_FOUND)
    return {"status": "success"}


class AutoAssignBusBody(BaseModel):
    strategy: str = "year"


@router.post(
    "/buses/auto-assign",
    responses={**auth_responses, 400: {"description": "No buses configured"}, 403: {"description": ERROR_FORBIDDEN}}
)
async def auto_assign_buses(
    body: AutoAssignBusBody,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Auto-assigns registered users (with bus) to buses by year or registration order."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.BUSES)

    config = await ConfigService.get_config(db)
    buses = config.homepage.bus_schedule.buses
    if not buses:
        raise HTTPException(status_code=400, detail="No buses configured")

    user_coll = User.get_collection(db)
    users = await user_coll.find({"is_registered": True, "bus_option": {"$ne": "NONE"}}).to_list(length=1000)

    if body.strategy == "year":
        users_sorted = sorted(users, key=lambda u: (u.get("matriculation") or 99))
    else:
        users_sorted = sorted(users, key=lambda u: u.get("_id", 0))

    bus_capacities = {b.id: b.capacity for b in buses}
    bus_counts: Dict[str, int] = {b.id: 0 for b in buses}

    for user in users_sorted:
        uid = user["_id"]
        assigned = None
        for bus in buses:
            if bus_counts[bus.id] < bus_capacities[bus.id]:
                assigned = bus.id
                bus_counts[bus.id] += 1
                break
        await user_coll.update_one({"_id": uid}, {"$set": {"bus_assignment": assigned}})

    return {"status": "success", "assigned": len(users_sorted)}


_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


def _validate_image(image: UploadFile, data: bytes) -> str:
    if image.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpeg, png, webp")
    if len(data) > _MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10 MB.")
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    return ext_map[image.content_type]


@router.put(
    "/homepage/dj/photo",
    responses={
        **auth_responses,
        400: {"description": "Invalid image or size"},
        403: {"description": ERROR_FORBIDDEN},
        503: {"description": "Storage not configured"}
    }
)
async def upload_dj_photo(
    image: Annotated[UploadFile, File(...)],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Uploads DJ photo to R2 and stores URL in config."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.HOMEPAGE)
    if not storage_client.enabled:
        raise HTTPException(status_code=503, detail="R2 storage not configured")

    data = await image.read()
    ext = _validate_image(image, data)
    key = f"gala/homepage/dj_{uuid.uuid4().hex}.{ext}"
    url = storage_client.upload_image(key, data, image.content_type)
    if not url:
        raise HTTPException(status_code=503, detail="Failed to upload image")

    config = await ConfigService.get_config(db)
    if config.homepage.dj.photo_url:
        storage_client.delete_image(config.homepage.dj.photo_url)

    config_coll = GlobalConfig.get_collection(db)
    await config_coll.update_one({"_id": "GLOBAL_CONFIG"}, {"$set": {"homepage.dj.photo_url": url}})
    return {"url": url}


@router.delete(
    "/homepage/dj/photo",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
)
async def delete_dj_photo(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Removes DJ photo from R2 and config."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.HOMEPAGE)

    config = await ConfigService.get_config(db)
    if config.homepage.dj.photo_url:
        storage_client.delete_image(config.homepage.dj.photo_url)

    config_coll = GlobalConfig.get_collection(db)
    await config_coll.update_one({"_id": "GLOBAL_CONFIG"}, {"$set": {"homepage.dj.photo_url": None}})
    return {"status": "success"}


@router.put(
    "/homepage/gallery/preview",
    responses={
        **auth_responses,
        400: {"description": "Invalid file type or size"},
        403: {"description": ERROR_FORBIDDEN},
        503: {"description": "Storage or upload failure"}
    }
)
async def upload_gallery_preview(
    image: Annotated[UploadFile, File(...)],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Uploads gallery preview photo to R2."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.HOMEPAGE)
    if not storage_client.enabled:
        raise HTTPException(status_code=503, detail="R2 storage not configured")

    data = await image.read()
    ext = _validate_image(image, data)
    key = f"gala/homepage/gallery_preview_{uuid.uuid4().hex}.{ext}"
    url = storage_client.upload_image(key, data, image.content_type)
    if not url:
        raise HTTPException(status_code=503, detail="Failed to upload image")

    config = await ConfigService.get_config(db)
    if config.homepage.gallery.preview_photo_url:
        storage_client.delete_image(config.homepage.gallery.preview_photo_url)

    config_coll = GlobalConfig.get_collection(db)
    await config_coll.update_one({"_id": "GLOBAL_CONFIG"}, {"$set": {"homepage.gallery.preview_photo_url": url}})
    return {"url": url}
