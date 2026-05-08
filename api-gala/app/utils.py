import secrets
import string
from datetime import date
from typing import Set, TypeVar, Callable, Type
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
    """Returns True if today is past the given ISO date string (YYYY-MM-DD)."""
    try:
        deadline = date.fromisoformat(deadline_str)
        return date.today() > deadline
    except (ValueError, TypeError):
        return False
