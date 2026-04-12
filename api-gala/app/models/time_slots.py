from datetime import datetime
from app.models import BaseDocument


from pydantic import Field

TIME_SLOTS_ID = "TIME_SLOTS"


class TimeSlots(BaseDocument):
    registration_start: datetime = Field(alias="registrationStart")
    registration_end: datetime = Field(alias="registrationEnd")
    nominations_start: datetime = Field(alias="nominationsStart")
    nominations_end: datetime = Field(alias="nominationsEnd")
    votes_start: datetime = Field(alias="votesStart")
    votes_end: datetime = Field(alias="votesEnd")
    tables_start: datetime = Field(alias="tablesStart")
    tables_end: datetime = Field(alias="tablesEnd")
    gala_start: datetime = Field(alias="galaStart")

    class Config:
        allow_population_by_field_name = True

