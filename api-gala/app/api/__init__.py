from fastapi import APIRouter
from app.api import registration, table, user, vote, limits
from app.api import time_slots
from app.api.time import router as time_router
from app.api.config import router as config_router
from app.api.admin.router import router as admin_router

router = APIRouter()

router.include_router(registration.router, prefix="/registration", tags=["registration"])
router.include_router(table.router, prefix="/table", tags=["table"])
router.include_router(user.router, prefix="/user", tags=["user"])
router.include_router(vote.router, prefix="/voting", tags=["voting"])
router.include_router(limits.router, prefix="/limits", tags=["limits"])
router.include_router(time_slots.router, prefix="/time_slots", tags=["time_slots"])
router.include_router(time_router, prefix="/time")
router.include_router(config_router, prefix="/config")
router.include_router(admin_router, prefix="/admin")
