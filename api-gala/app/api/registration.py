from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, HTTPException, status
from typing import Dict, Any, Annotated
from app.api.auth import api_nei_auth, AuthData, auth_responses
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.config import SettingsDep
from app.core.email import send_email
from app.models.user import User
from app.services.registration import RegistrationService


router = APIRouter()


@router.get("/status", response_model=User, responses={**auth_responses})
async def get_registration_status(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Returns the current registration status and wizard progress for the authenticated user."""
    user = await RegistrationService.get_user_registration(db, auth.sub)
    if not user:
        # Create user record if not exists (first time accessing registration)
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
    # Map frontend 'year' to 'matriculation' if needed
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
            phased_payment=user.phased_payment,
            companions=user.companions,
        )

    return user


@router.post(
    "/payment-proof", 
    response_model=Dict[str, str], 
    responses={**auth_responses, 400: {"description": "Invalid file type"}}
)
async def upload_payment_proof(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    file: Annotated[UploadFile, File(...)]
):
    """Uploads a payment proof file to R2 storage."""
    if not file.content_type.startswith("image/") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file type. Only images and PDFs are allowed."
        )
        
    file_data = await file.read()
    url = await RegistrationService.upload_payment_proof(db, auth.sub, file_data, file.content_type)
    return {"url": url}
