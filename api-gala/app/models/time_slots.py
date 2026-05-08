from datetime import datetime, timezone
from typing import Optional
from app.models import BaseDocument


from pydantic import Field, validator

TIME_SLOTS_ID = "TIME_SLOTS"

_EPOCH = datetime(2026, 1, 1, tzinfo=timezone.utc)


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
        dt = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        return None if dt <= _EPOCH else v

    class Config:
        allow_population_by_field_name = True

