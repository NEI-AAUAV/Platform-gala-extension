import re
from pydantic import BaseModel

from app.core.db.types import DBType, CollectionType


class BaseDocument(BaseModel):
    class Config:
        allow_population_by_field_name = True

    @classmethod
    def collection(cls) -> str:
        names = re.findall(r"[A-Z][a-z]+|[A-Z]+(?![a-z])", cls.__name__)
        return "_".join(names).lower()

    @classmethod
    def get_collection(cls, db: DBType) -> CollectionType:
        return db[cls.collection()]
