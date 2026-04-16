import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, Response, HTTPException, UploadFile, File, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Annotated, Optional, Dict, Any, Union
from app.api.auth import api_nei_auth, ScopeEnum, AuthData, auth_responses
from app.services.storage import storage_client
from app.core.config import SettingsDep
from app.core.db import get_db
from app.core.db.types import DBType
from app.core.email import send_email
from app.models.config import GlobalConfig
from app.models.user import User
from app.models.manager_permissions import ManagerPermission
from app.services.config import ConfigService
from app.services.export import ExportService
from app.services.vote import VoteService
from app.services.manager_permissions import ManagerPermissionsService
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
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)

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
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
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
    """Manually updates registration data for a specific user."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
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
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.REGISTRATION)
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
    """Merges multiple nominee names into one target name."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.CATEGORIES)
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
    """Finalizes nominations for a category, selecting the top 4."""
    await ManagerPermissionsService.require_feature(db, auth, ManagerPermission.CATEGORIES)
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
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 404: {"description": "User not found"}}
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
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success"}


class AutoAssignBusBody(BaseModel):
    strategy: str = "year"


@router.post(
    "/buses/auto-assign",
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}}
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
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 503: {"description": "Storage not configured"}}
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
    responses={**auth_responses, 403: {"description": ERROR_FORBIDDEN}, 503: {"description": "Storage not configured"}}
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
