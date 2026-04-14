from datetime import datetime
from app.models import BaseDocument


from pydantic import Field

TIME_SLOTS_ID = "TIME_SLOTS"


class TimeSlots(BaseDocument):
    registration_start: datetime = Field(alias="registrationStart", default_factory=lambda: datetime.fromtimestamp(0))
    registration_end: datetime = Field(alias="registrationEnd", default_factory=lambda: datetime.fromtimestamp(0))
    nominations_start: datetime = Field(alias="nominationsStart", default_factory=lambda: datetime.fromtimestamp(0))
    nominations_end: datetime = Field(alias="nominationsEnd", default_factory=lambda: datetime.fromtimestamp(0))
    votes_start: datetime = Field(alias="votesStart", default_factory=lambda: datetime.fromtimestamp(0))
    votes_end: datetime = Field(alias="votesEnd", default_factory=lambda: datetime.fromtimestamp(0))
    tables_start: datetime = Field(alias="tablesStart", default_factory=lambda: datetime.fromtimestamp(0))
    tables_end: datetime = Field(alias="tablesEnd", default_factory=lambda: datetime.fromtimestamp(0))
    gala_start: datetime = Field(alias="galaStart", default_factory=lambda: datetime.fromtimestamp(0))

    class Config:
        allow_population_by_field_name = True

