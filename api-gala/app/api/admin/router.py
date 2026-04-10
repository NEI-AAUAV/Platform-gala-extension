from fastapi import APIRouter, BackgroundTasks, Depends, Response, HTTPException, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Annotated, Optional, Dict, Any, Union
from app.api.auth import api_nei_auth, ScopeEnum, AuthData, auth_responses
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.email import send_email
from app.models.config import GlobalConfig
from app.models.user import User
from app.services.config import ConfigService
from app.services.export import ExportService
from app.services.vote import VoteService
from app.models.vote import VoteCategory
from app.models.time_slots import TimeSlots, TIME_SLOTS_ID


router = APIRouter()

ERROR_FORBIDDEN = "Not enough permissions"


@router.get("/config", response_model=GlobalConfig, responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}})
async def get_config(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Retrieves the global event configuration (Admin/Manager only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

    return await ConfigService.get_config(db)


@router.put("/config", response_model=GlobalConfig, responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}})
async def update_config(
    config: GlobalConfig,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Updates the global event configuration (Admin/Manager only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
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
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
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
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
    csv_data = await ExportService.export_tables(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tables.csv"}
    )


@router.post(
    "/registrations/{user_id}/confirm_payment",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "User not found"}}
)
async def confirm_payment(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)],
    settings: SettingsDep,
):
    """Manually confirms payment for a user."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one_and_update(
        {"_id": user_id},
        {"$set": {"has_payed": True}},
        return_document=True,
    )
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")

    user = User.parse_obj(user_dict)
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


@router.get(
    "/registrations/{user_id}", 
    response_model=User,
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "User not found"}}
)
async def get_registration(
    user_id: int,
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Retrieves registration data for a specific user."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
    user_coll = User.get_collection(db)
    user_dict = await user_coll.find_one({"_id": user_id})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    return User.parse_obj(user_dict)


@router.patch(
    "/registrations/{user_id}", 
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "User not found"}}
)
async def update_registration_admin(
    user_id: int,
    updates: Dict[str, Any],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Manually updates registration data for a specific user (Admin only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
    user_coll = User.get_collection(db)
    result = await user_coll.update_one({"_id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
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
    """Lists all successfully registered users."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
    user_coll = User.get_collection(db)
    cursor = user_coll.find({"is_registered": True})
    users = await cursor.to_list(length=1000)
    return [User.parse_obj(u) for u in users]


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
    """Merges multiple nominee names into one target name (Admin only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

    success = await VoteService.merge_nominees(db, category_id, body.target_name, body.source_names)
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
    """Finalizes nominations for a category, selecting the top 4 (Admin only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
    success = await VoteService.finalize_nominations(db, category_id)
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
    """Toggles various phases of a vote category (Admin only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

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


@router.get("/time", response_model=TimeSlots, responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "Time slots not found"}})
async def get_time_slots(
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Retrieves the event time slots (Admin/Manager only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)

    collection = TimeSlots.get_collection(db)
    result = await collection.find_one({"_id": TIME_SLOTS_ID})
    if not result:
        raise HTTPException(status_code=404, detail="Time slots not found")
    return TimeSlots.parse_obj(result)


@router.patch("/time", response_model=TimeSlots, responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "Time slots not found"}})
async def update_time_slots(
    updates: Dict[str, Any],
    db: Annotated[DBType, Depends(get_db)],
    auth: Annotated[AuthData, Depends(api_nei_auth)]
):
    """Updates the event time slots (Admin/Manager only)."""
    if ScopeEnum.MANAGER_GALA not in auth.scopes and ScopeEnum.ADMIN not in auth.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERROR_FORBIDDEN)
        
    collection = TimeSlots.get_collection(db)
    await collection.update_one({"_id": TIME_SLOTS_ID}, {"$set": updates})
    result = await collection.find_one({"_id": TIME_SLOTS_ID})
    return TimeSlots.parse_obj(result)
