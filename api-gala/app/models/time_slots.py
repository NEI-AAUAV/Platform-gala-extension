from datetime import datetime
from app.models import BaseDocument


TIME_SLOTS_ID = "TIME_SLOTS"


class TimeSlots(BaseDocument):
    registrationStart: datetime
    registrationEnd: datetime
    nominationsStart: datetime
    nominationsEnd: datetime
    votesStart: datetime
    votesEnd: datetime
    tablesStart: datetime
    tablesEnd: datetime
    galaStart: datetime
