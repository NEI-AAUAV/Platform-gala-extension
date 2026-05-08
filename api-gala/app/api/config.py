from fastapi import APIRouter
from app.core.db import DatabaseDep
from app.services.config import ConfigService
from app.models.config import GlobalConfig

router = APIRouter()


@router.get("", response_model=GlobalConfig)
async def get_public_config(db: DatabaseDep):
    """Returns the current gala configuration (publicly accessible info)."""
    return await ConfigService.get_config(db)
