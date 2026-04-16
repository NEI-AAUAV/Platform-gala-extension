from enum import Enum
from typing import List
from pydantic import Field
from app.models import BaseDocument


class ManagerPermission(str, Enum):
    REGISTRATION = "registration"
    TABLES = "tables"
    CATEGORIES = "categories"
    HOMEPAGE = "homepage"
    BUSES = "buses"


class ManagerPermissions(BaseDocument):
    id: int = Field(alias="_id")
    name: str
    email: str
    permissions: List[ManagerPermission] = []
