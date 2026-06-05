from datetime import datetime, timezone
from typing import Optional
from app.models import BaseDocument


from pydantic import Field, root_validator, validator

TIME_SLOTS_ID = "TIME_SLOTS"

_EPOCH = datetime(1990, 1, 1, tzinfo=timezone.utc)


class TimeSlots(BaseDocument):
    registration_start: Optional[datetime] = Field(alias="registrationStart", default=None)
    registration_end: Optional[datetime] = Field(alias="registrationEnd", default=None)
    nominations_start: Optional[datetime] = Field(alias="nominationsStart", default=None)
    nominations_end: Optional[datetime] = Field(alias="nominationsEnd", default=None)
    votes_start: Optional[datetime] = Field(alias="votesStart", default=None)
    votes_end: Optional[datetime] = Field(alias="votesEnd", default=None)
    tables_start: Optional[datetime] = Field(alias="tablesStart", default=None)
    tables_end: Optional[datetime] = Field(alias="tablesEnd", default=None)
    gala_start: Optional[datetime] = Field(alias="galaStart", default=None)

    @root_validator(pre=True)
    def normalize_aliases(cls, values):
        if not isinstance(values, dict):
            return values
        normalized = dict(values)
        for field_name, model_field in cls.__fields__.items():
            alias = model_field.alias
            if alias not in normalized and field_name in normalized:
                normalized[alias] = normalized[field_name]
            if field_name not in normalized and alias in normalized:
                normalized[field_name] = normalized[alias]
        return normalized

    @validator(
        "registration_start", "registration_end",
        "nominations_start", "nominations_end",
        "votes_start", "votes_end",
        "tables_start", "tables_end",
        "gala_start",
        pre=True, always=True,
    )
    def epoch_to_none(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return None
        if isinstance(v, str):
            if not v:
                return None
            try:
                parsed = datetime.fromisoformat(v.replace("Z", "+00:00"))
            except ValueError:
                return v
            dt = parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            return None if dt <= _EPOCH else v
        dt = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        return None if dt <= _EPOCH else v

    class Config:
        allow_population_by_field_name = True
