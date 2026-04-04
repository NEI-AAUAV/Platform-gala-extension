from fastapi import APIRouter
from datetime import datetime, timezone
from typing import Dict

router = APIRouter(tags=["Time"])

@router.get("", response_model=Dict[str, str])
async def get_server_time():
    """Returns the current server time in ISO format."""
    return {"time": datetime.now(timezone.utc).isoformat().replace("+00:00", "") + "Z"}
