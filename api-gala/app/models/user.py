from enum import Enum
from typing import Annotated, Optional, List
from pydantic import BaseModel, Field
from app.models import BaseDocument
from app.models.table import Companion


class BusOption(str, Enum):
    ROUND_TRIP = "ROUND_TRIP"
    ONE_WAY = "ONE_WAY"
    NONE = "NONE"


class Matriculation(BaseModel):
    __root__: Annotated[int, Field(ge=1, le=5)]


class User(BaseDocument):
    id: int = Field(alias="_id")
    matriculation: Optional[Matriculation]
    nmec: int
    email: str
    name: str
    
    # Registration Wizard State
    registration_step: int = 1
    is_registered: bool = False
    
    # Logistics
    phone: Optional[str] = None
    bus_option: BusOption = BusOption.NONE
    meal_option: Optional[str] = None
    food_allergies: Optional[str] = None
    
    # Payment
    has_payed: bool = False
    phased_payment: bool = False
    payment_proof_url: Optional[str] = None
    payment_proof_url_phase2: Optional[str] = None
    
    # Table
    table_id: Optional[int] = None

    # Bus assignment (set by admin)
    bus_assignment: Optional[str] = None

    # Companions
    companions: List[Companion] = []

    # Admin-created registrations (no Authentik account yet)
    # When set, this registration was created by an admin for a person without an account.
    # When that person later creates an account with this email, the registration is linked.
    admin_created: bool = False
    # Email-indexed companions: maps companion name → email for future account linking
    companion_emails: List[str] = []
    
    # If registered as a companion by someone else, points to the host's ID
    is_companion_of: Optional[int] = None
