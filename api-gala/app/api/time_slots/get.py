from fastapi import APIRouter

from app.models.time_slots import TimeSlots
from app.core.db import DatabaseDep

from .util import fetch_time_slots

router = APIRouter()


@router.get("/")
async def get_time_slots(*, db: DatabaseDep) -> TimeSlots:
    """Gets the current time slots config"""
    return await fetch_time_slots(db)
