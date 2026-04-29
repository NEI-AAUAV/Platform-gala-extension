from fastapi import APIRouter, BackgroundTasks, Depends, Query, UploadFile, File, HTTPException, status
from typing import Dict, Any, Annotated
from app.api.auth import api_nei_auth, AuthData, auth_responses
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.config import SettingsDep
from app.core.email import send_email
from app.models.user import User
from app.services.registration import RegistrationService

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

router = APIRouter()


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
    responses={**auth_responses, 400: {"description": "Invalid file type or size"}}
)
async def upload_payment_proof(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    file: Annotated[UploadFile, File(...)],
    phase: int = Query(default=1, ge=1, le=2),
):
    """Uploads a payment proof file to R2 storage. Use phase=1 or phase=2."""
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
