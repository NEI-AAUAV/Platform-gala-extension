import secrets
import string
from datetime import date, datetime, timezone
from typing import Any, Set, TypeVar, Callable, Type
from pydantic import BaseModel


def generate_invite_token(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

_C = TypeVar("_C", bound=BaseModel)


def optional(*, exclude: Set[str] = set()) -> Callable[[Type[_C]], Type[_C]]:
    """Decorator function used to modify a pydantic model's fields to all be optional.

    Can also define fields to exclude from being optional.

    Based on https://github.com/samuelcolvin/pydantic/issues/1223#issuecomment-775363074
    """

    def dec(_cls: Type[_C]) -> Type[_C]:
        for field in _cls.__fields__:
            if field in exclude:
                continue

            _cls.__fields__[field].required = False
        return _cls

    return dec


class NotFoundReCheck(Exception):
    pass


def is_deadline_passed(deadline_str: str) -> bool:
    """Returns True if the given ISO date/datetime payment deadline has passed.

    Date-only strings (YYYY-MM-DD) remain valid until the day after the date,
    preserving the previous inclusive-date behavior.
    """
    try:
        if "T" not in deadline_str:
            deadline = date.fromisoformat(deadline_str)
            return date.today() > deadline

        normalized = deadline_str.replace("Z", "+00:00")
        deadline_dt = datetime.fromisoformat(normalized)
        now = datetime.now(tz=timezone.utc)
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
        return now > deadline_dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return False


def meal_label_from_config(meal_option: str | None, config: Any) -> str:
    if not meal_option:
        return "—"
    meal_map = {meal.id: meal.name for meal in config.meals}
    return meal_map.get(meal_option, meal_option)


def companions_with_meal_labels(companions: list, config: Any) -> list:
    meal_map = {meal.id: meal.name for meal in config.meals}
    out = []
    for companion in companions or []:
        dish_id = companion.dish
        dish_label = meal_map.get(dish_id, dish_id or "—")
        out.append({**companion.dict(), "dish": dish_label})
    return out
