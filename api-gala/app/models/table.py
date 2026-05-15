from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, PositiveInt, Field, validator
from app.models import BaseDocument


class DishType(str, Enum):
    NORMAL = "NOR"
    VEGETARIAN = "VEG"


class Companion(BaseModel):
    name: str
    email: str
    dish: Optional[DishType] = None
    allergies: str = ""

    @validator("dish", pre=True)
    def normalize_dish(cls, value):
        if value in (None, "", "NONE"):
            return None
        if isinstance(value, str):
            normalized = value.strip().upper()
            mapping = {
                "NOR": DishType.NORMAL,
                "NORMAL": DishType.NORMAL,
                "CARNE": DishType.NORMAL,
                "VEG": DishType.VEGETARIAN,
                "VEGETARIAN": DishType.VEGETARIAN,
                "VEGETARIANO": DishType.VEGETARIAN,
            }
            return mapping.get(normalized, None)
        return value


class TablePerson(BaseModel):
    id: int
    allergies: str
    dish: DishType
    confirmed: bool
    companions: List[Companion]


class Table(BaseDocument):
    id: int = Field(alias="_id")
    name: Optional[str] = None
    photo_url: Optional[str] = None
    invite_token: Optional[str] = None
    # User IDs (auth.sub) that have been invited to this table
    invites: List[int] = []
    head: Optional[int] = None
    seats: PositiveInt = 10
    persons: List[TablePerson] = []

    @classmethod
    def collection(cls) -> str:
        return "table"

    def confirmed_seats(self) -> int:
        return sum(
            1 + len(person.companions) for person in self.persons if person.confirmed
        )
