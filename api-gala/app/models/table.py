from typing import List, Optional
from pydantic import BaseModel, PositiveInt, Field
from app.models import BaseDocument
from app.models.config import DishType


class Companion(BaseModel):
    name: str
    email: str
    dish: Optional[str] = None
    allergies: str = ""


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
    # Creator of the table (business owner of the table)
    owner_id: Optional[int] = None
    head: Optional[int] = None
    seats: PositiveInt = 11
    persons: List[TablePerson] = []

    @classmethod
    def collection(cls) -> str:
        return "table"

    def confirmed_seats(self) -> int:
        return sum(
            1 + len(person.companions) for person in self.persons if person.confirmed
        )
