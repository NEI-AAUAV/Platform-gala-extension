from typing import List, Optional
from pydantic import Field
from app.models import BaseDocument
from app.models.table import Companion, DishType


class Registration(BaseDocument):
    id: int = Field(alias="_id")
    user_id: str
    nmec: str
    year: int
    
    current_step: int = 1
    is_registered: bool = False
    
    # Logistics
    bus: str = "none"
    meal: str = ""
    allergies: str = ""
    
    # Companions
    companions: List[Companion] = []
    
    # Payment
    payment_proof_phase_1: Optional[str] = None
    payment_proof_phase_2: Optional[str] = None
    confirmed: bool = False
    
    # Table
    table_id: Optional[int] = None

    @classmethod
    def collection(cls) -> str:
        return "registration"
