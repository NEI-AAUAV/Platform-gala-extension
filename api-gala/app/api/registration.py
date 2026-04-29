from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, Query, UploadFile, File, HTTPException, status
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
from app.utils import is_deadline_passed

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

router = APIRouter()


async def _require_registration_open(db: DBType) -> None:
    ts_coll = TimeSlots.get_collection(db)
    ts_doc = await ts_coll.find_one({"_id": TIME_SLOTS_ID})
    if not ts_doc:
        return
    ts = TimeSlots.parse_obj(ts_doc)
    now = datetime.now(tz=timezone.utc)

    reg_start = ts.registration_start
    reg_end = ts.registration_end
    if reg_start.tzinfo is None:
        reg_start = reg_start.replace(tzinfo=timezone.utc)
    if reg_end.tzinfo is None:
        reg_end = reg_end.replace(tzinfo=timezone.utc)

    # 1970 sentinel means "not configured" — allow through
    if reg_start.year <= 1970 and reg_end.year <= 1970:
        return

    if reg_start.year > 1970 and now < reg_start:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="As inscrições ainda não estão abertas.")
    if reg_end.year > 1970 and now > reg_end:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="O prazo de inscrições já terminou.")


@router.get("/status", response_model=User, responses={**auth_responses})
async def get_registration_status(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Returns the current registration status and wizard progress for the authenticated user."""
    user = await RegistrationService.get_user_registration(db, auth.sub)
    if not user:
        user_coll = User.get_collection(db)
        user = User(
            id=auth.sub,
            nmec=auth.nmec or 0,
            email=auth.email,
            name=f"{auth.name} {auth.surname}",
            registration_step=1
        )
        await user_coll.insert_one(user.dict(by_alias=True))
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

    existing = await RegistrationService.get_user_registration(db, auth.sub)
    if not existing:
        user_coll = User.get_collection(db)
        new_user = User(
            id=auth.sub,
            nmec=auth.nmec or 0,
            email=auth.email,
            name=f"{auth.name} {auth.surname}",
            registration_step=1
        )
        await user_coll.insert_one(new_user.dict(by_alias=True))

    try:
        user = await RegistrationService.update_step(db, auth.sub, step, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if step == 6 and user.is_registered:
        bus_labels = {"ROUND_TRIP": "Autocarro (Ida e Volta)", "ONE_WAY": "Autocarro (Apenas Ida)", "NONE": "Deslocação própria"}
        year_label = f"{user.matriculation.__root__}º Ano" if user.matriculation else "Alumni / Outro"
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
            meal=user.meal_option or "—",
            allergies=user.food_allergies or "Nenhuma",
            phone=user.phone or "—",
            phased_payment=user.phased_payment,
            companions=user.companions,
        )

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
    phase: int = Query(default=1, ge=1, le=2),
):
    """Uploads a payment proof file to R2 storage. Use phase=1 or phase=2."""
    config = await ConfigService.get_config(db)
    prices = config.prices

    if phase == 1:
        deadline = prices.phase1_deadline if prices.phased_payment_enabled and prices.phase1_deadline else config.payment_deadline_date
    else:
        deadline = prices.phase2_deadline if prices.phase2_deadline else config.payment_deadline_date

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
