from typing import List, Optional
from pydantic import BaseModel, Field
from app.models import BaseDocument


CONFIG_ID = "GLOBAL_CONFIG"


class MealOption(BaseModel):
    id: str
    name: str
    description: str
    is_active: bool = True


class DJConfig(BaseModel):
    visible: bool = False
    name: str = ""
    bio: str = ""
    photo_url: Optional[str] = None
    spotify_url: Optional[str] = None


class BusVehicle(BaseModel):
    id: str
    name: str
    capacity: int = 50


class BusScheduleConfig(BaseModel):
    visible: bool = False
    departure_location: str = ""
    departure_time: str = ""
    return_time: str = ""
    buses: List[BusVehicle] = []


class AfterPartyConfig(BaseModel):
    visible: bool = False
    title: str = "After Party"
    description: str = ""
    drinks: List[str] = []


class GalleryConfig(BaseModel):
    visible: bool = False
    title: str = "Galeria"
    description: str = ""
    drive_url: str = ""
    preview_photo_url: Optional[str] = None


class NominationsDisplayConfig(BaseModel):
    visible: bool = False
    show_nominees: bool = False


class PaymentInfoConfig(BaseModel):
    visible: bool = True


class EmailNotificationsConfig(BaseModel):
    registration_confirmed: bool = True
    payment_confirmed: bool = True
    payment_rejected: bool = True
    table_invite: bool = True
    table_confirmed: bool = True


class HomepageConfig(BaseModel):
    dj: DJConfig = Field(default_factory=DJConfig)
    bus_schedule: BusScheduleConfig = Field(default_factory=BusScheduleConfig)
    after_party: AfterPartyConfig = Field(default_factory=AfterPartyConfig)
    gallery: GalleryConfig = Field(default_factory=GalleryConfig)
    nominations_display: NominationsDisplayConfig = Field(default_factory=NominationsDisplayConfig)
    payment_info: PaymentInfoConfig = Field(default_factory=PaymentInfoConfig)


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
    total_price: float = 0.0
    phased_payment_enabled: bool = False
    phase1_amount: Optional[float] = None
    phase1_deadline: Optional[str] = None
    phase2_amount: Optional[float] = None
    phase2_deadline: Optional[str] = None

    iban: str = ""
    holder: str = ""
    description_template: str = "Gala - <Nome> (<Nmec>)"
    contacts: List[PaymentContact] = []


class GlobalConfig(BaseDocument):
    id: str = Field(default=CONFIG_ID, alias="_id")
    event_name: str = "Gala Dinner"
    event_location: str = ""
    event_description: str = ""
    rules: List[str] = []
    items_included: List[str] = []

    prices: PriceConfig = Field(default_factory=PriceConfig)
    bus: BusConfig = Field(default_factory=BusConfig)
    meals: List[MealOption] = []

    max_registrations: int = 200
    max_table_size: int = 10
    table_photo_enabled: bool = True

    allergies_required: bool = False
    payment_method: str = "both"
    payment_deadline_hours: int = 48
    payment_deadline_date: str = ""
    payment_email: str = ""

    homepage: HomepageConfig = Field(default_factory=HomepageConfig)
    email_notifications: EmailNotificationsConfig = Field(default_factory=EmailNotificationsConfig)

    @classmethod
    def collection(cls) -> str:
        return "config"
