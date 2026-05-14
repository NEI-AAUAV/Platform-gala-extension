from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, Query, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Annotated
from app.api.auth import api_nei_auth, AuthData, auth_responses
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.config import SettingsDep
from app.core.email import send_email
from app.models.user import User
from app.models.time_slots import TimeSlots, TIME_SLOTS_ID
from app.services.registration import RegistrationService
from app.services.config import ConfigService
from app.services.authentik_service import sync_email_based_registrations
from app.api.limits.util import fetch_limits
from app.services.storage import storage_client
from app.utils import is_deadline_passed
from app.core.logging import logger

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

router = APIRouter()


def _meal_label_from_config(meal_option: str | None, config) -> str:
    if not meal_option:
        return "—"
    meal_map = {meal.id: meal.name for meal in config.meals}
    if meal_option in meal_map:
        return meal_map[meal_option]
    legacy = {"NOR": "Carne", "NORMAL": "Carne", "CARNE": "Carne", "VEG": "Vegetariano", "VEGETARIAN": "Vegetariano", "VEGETARIANO": "Vegetariano"}
    return legacy.get(meal_option.strip().upper(), meal_option)


def _companions_with_meal_labels(companions: list, config) -> list:
    meal_map = {meal.id: meal.name for meal in config.meals}
    legacy = {"NOR": "Carne", "NORMAL": "Carne", "CARNE": "Carne", "VEG": "Vegetariano", "VEGETARIAN": "Vegetariano", "VEGETARIANO": "Vegetariano"}
    out = []
    for c in companions or []:
        dish = c.dish.value if c.dish else "—"
        dish_label = meal_map.get(dish, legacy.get(str(dish).strip().upper(), dish))
        out.append({**c.dict(), "dish": dish_label})
    return out


async def _require_registration_open(db: DBType) -> None:
    ts_coll = TimeSlots.get_collection(db)
    ts_doc = await ts_coll.find_one({"_id": TIME_SLOTS_ID})
    if not ts_doc:
        return
    ts = TimeSlots.parse_obj(ts_doc)
    now = datetime.now(tz=timezone.utc)

    reg_start = ts.registration_start
    reg_end = ts.registration_end

    if reg_start is None and reg_end is None:
        return

    if reg_start is not None:
        if reg_start.tzinfo is None:
            reg_start = reg_start.replace(tzinfo=timezone.utc)
        if now < reg_start:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="As inscrições ainda não estão abertas.")

    if reg_end is not None:
        if reg_end.tzinfo is None:
            reg_end = reg_end.replace(tzinfo=timezone.utc)
        if now > reg_end:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="O prazo de inscrições já terminou.")


class RegistrationCapacity(BaseModel):
    remaining: int
    total: int


@router.get("/capacity", response_model=RegistrationCapacity)
async def get_registration_capacity(
    db: Annotated[DBType, Depends(get_db)],
):
    """Returns the number of remaining and total seats. No auth required."""
    limits = await fetch_limits(db)
    total = await RegistrationService.count_registered_attendees(db)
    remaining = max(0, limits.maxRegistrations - total)
    return RegistrationCapacity(remaining=remaining, total=limits.maxRegistrations)


@router.get("/status", response_model=User, responses={**auth_responses})
async def get_registration_status(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
):
    """Returns the current registration status and wizard progress for the authenticated user."""
    # On every status check, try to sync any phantom registrations (admin-created for this email)
    await sync_email_based_registrations(db, auth.sub, auth.email)
    await RegistrationService.apply_payment_deadline_policy(db)

    user = await RegistrationService.get_or_create_user_registration(
        db, auth.sub, auth.email, f"{auth.name} {auth.surname}", auth.nmec
    )
    return user


@router.post(
    "/init",
    response_model=User,
    responses={**auth_responses},
)
async def initialize_registration(
    data: Dict[str, Any],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
):
    """Initializes or updates basic registration info (NMEC and Matriculation/Year)."""
    await _require_registration_open(db)

    limits = await fetch_limits(db)
    total = await RegistrationService.count_registered_attendees(db)
    if total >= limits.maxRegistrations:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="As inscrições estão encerradas.")

    if "year" in data and "matriculation" not in data:
        data["matriculation"] = data["year"]

    try:
        return await RegistrationService.update_step(db, auth.sub, 2, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/step/{step}",
    response_model=User,
    responses={**auth_responses, 400: {"description": "Validation error"}}
)
async def update_registration_step(
    step: int,
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
):
    """Updates the user registration record for a specific wizard step."""
    # Steps 1-5 require registration to be open; step 6 (final confirm) is always allowed
    if step < 6:
        await _require_registration_open(db)

    user = await RegistrationService.get_or_create_user_registration(
        db, auth.sub, auth.email, f"{auth.name} {auth.surname}", auth.nmec
    )
    if user.is_registered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A inscrição já foi concluída e não pode ser alterada.",
        )

    try:
        user = await RegistrationService.update_step(db, auth.sub, step, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if step == 6 and user.is_registered:
        bus_labels = {"ROUND_TRIP": "Autocarro (Ida e Volta)", "ONE_WAY": "Autocarro (Apenas Ida)", "NONE": "Deslocação própria"}
        year_label = f"{user.matriculation.__root__}º Ano" if user.matriculation else "Alumni / Outro"
        
        config = await ConfigService.get_config(db)
        if config.email_notifications.registration_confirmed:
            logger.info("Queueing registration confirmation email for {}", user.email)
            background_tasks.add_task(
                send_email,
                user.email,
                "Inscrição no Jantar de Gala confirmada",
                settings=settings,
                template="registered",
                name=user.name,
                nmec=user.nmec,
                year=year_label,
                bus=bus_labels.get(user.bus_option.value, "—"),
                meal=_meal_label_from_config(user.meal_option, config),
                allergies=user.food_allergies or "Nenhuma",
                phone=user.phone or "—",
                phased_payment=user.phased_payment,
                companions=_companions_with_meal_labels(user.companions, config),
            )
        else:
            logger.info("Registration confirmation email disabled in config for {}", user.email)

    return user


@router.post(
    "/payment-proof",
    response_model=Dict[str, str],
    responses={**auth_responses, 400: {"description": "Invalid file type, size, or deadline passed"}}
)
async def upload_payment_proof(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    file: Annotated[UploadFile, File(...)],
    phase: Annotated[int, Query(ge=1, le=2)] = 1,
):
    """Uploads a payment proof file to R2 storage. Use phase=1 or phase=2."""
    config = await ConfigService.get_config(db)
    prices = config.prices

    if phase == 1:
        deadline = prices.phase1_deadline if prices.phased_payment_enabled and prices.phase1_deadline else config.payment_deadline_date
    else:
        deadline = prices.phase2_deadline if prices.phase2_deadline else config.payment_deadline_date

    if not storage_client.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O armazenamento de ficheiros não está configurado."
        )

    if deadline and is_deadline_passed(deadline):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O prazo para envio do comprovativo já passou."
        )

    if not file.content_type.startswith("image/") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only images and PDFs are allowed."
        )

    file_data = await file.read()

    if len(file_data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )

    url = await RegistrationService.upload_payment_proof(db, auth.sub, file_data, file.content_type, phase)
    return {"url": url}
