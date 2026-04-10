from typing import List, Optional
from pydantic import BaseModel, Field
from app.models import BaseDocument


CONFIG_ID = "GLOBAL_CONFIG"


class MealOption(BaseModel):
    id: str
    name: str
    description: str
    is_active: bool = True


class BusConfig(BaseModel):
    enabled: bool = True
    price_round_trip: float = 0.0
    price_one_way: float = 0.0
    capacity: int = 50


class PaymentContact(BaseModel):
    name: str
    year: str
    phone: str


class PriceConfig(BaseModel):
    total_price: float
    phased_payment_enabled: bool = False
    phase1_amount: Optional[float] = None
    phase1_deadline: Optional[str] = None
    phase2_amount: Optional[float] = None
    phase2_deadline: Optional[str] = None

    iban: str = ""
    holder: str = ""
    description_template: str = "Gala - <Nome> (<Nmec>)"
    contacts: List[PaymentContact] = []


class EventDates(BaseModel):
    registration_start: str = ""
    registration_end: str = ""

    tables_start: str = ""
    tables_end: str = ""

    nominations_start: str = ""
    nominations_end: str = ""
    voting_start: str = ""
    voting_end: str = ""

    event_time: str = ""
    event_date: str = ""


class GlobalConfig(BaseDocument):
    id: str = Field(default=CONFIG_ID, alias="_id")
    event_name: str = "Gala Dinner"
    event_location: str = ""
    event_description: str = ""
    rules: List[str] = []
    items_included: List[str] = []

    dates: EventDates = Field(default_factory=EventDates)
    prices: PriceConfig
    bus: BusConfig
    meals: List[MealOption] = []

    max_registrations: int = 200
    max_table_size: int = 10

    allergies_required: bool = False
    payment_method: str = "both"
    payment_deadline_hours: int = 48
    payment_deadline_date: str = ""
    payment_email: str = ""

    @classmethod
    def collection(cls) -> str:
        return "config"
