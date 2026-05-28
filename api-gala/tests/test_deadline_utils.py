from datetime import date, datetime, timedelta, timezone

from app.utils import is_deadline_passed


def test_is_deadline_passed_keeps_date_deadline_valid_during_same_day():
    assert is_deadline_passed(date.today().isoformat()) is False


def test_is_deadline_passed_accepts_past_datetime_deadline():
    past = datetime.now(tz=timezone.utc) - timedelta(minutes=1)
    assert is_deadline_passed(past.isoformat()) is True


def test_is_deadline_passed_accepts_future_datetime_deadline():
    future = datetime.now(tz=timezone.utc) + timedelta(minutes=1)
    assert is_deadline_passed(future.isoformat()) is False


def test_is_deadline_passed_accepts_zulu_datetime_deadline():
    past = datetime.now(tz=timezone.utc) - timedelta(minutes=1)
    assert is_deadline_passed(past.isoformat().replace("+00:00", "Z")) is True
