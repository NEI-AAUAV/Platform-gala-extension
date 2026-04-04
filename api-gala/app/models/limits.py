from typing import Optional
from pydantic import PositiveInt
from app.models import BaseDocument


LIMITS_ID = "LIMITS"


class Limits(BaseDocument):
    maxRegistrations: PositiveInt
    maxBusSeats: Optional[PositiveInt] = None
    maxTablesCount: Optional[PositiveInt] = None
