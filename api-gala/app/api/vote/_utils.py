from datetime import datetime, timezone
from fastapi import HTTPException

from app.api.auth import AuthData
from app.core.db.types import DBType
from app.models.time_slots import TimeSlots
from app.models.vote import VoteCategory, VoteListing


async def fetch_category(category_id: int, db: DBType) -> VoteCategory:
    res = await VoteCategory.get_collection(db).find_one({"_id": category_id})

    if res is None:
        raise HTTPException(status_code=404, detail="Category not found")

    return VoteCategory.parse_obj(res)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def is_nominations_open(ts: TimeSlots) -> bool:
    if ts.nominations_start is None or ts.nominations_end is None:
        return False
    now = _now()
    return _ensure_utc(ts.nominations_start) <= now <= _ensure_utc(ts.nominations_end)


def is_voting_open(ts: TimeSlots) -> bool:
    if ts.votes_start is None or ts.votes_end is None:
        return False
    now = _now()
    return _ensure_utc(ts.votes_start) <= now <= _ensure_utc(ts.votes_end)


def anonymize_category(
    category: VoteCategory,
    auth: AuthData,
    ts: TimeSlots,
    results_visible: bool = False,
) -> VoteListing:
    already_voted = None
    scores = [0] * len(category.options)

    for vote in category.votes:
        scores[vote.option] += 1
        if vote.uid == auth.sub:
            already_voted = vote.option

    already_nominated = any(auth.sub in n.votes for n in category.nominations)

    return VoteListing(
        _id=category.id,
        category=category.category,
        options=category.options,
        photo_paths=category.photo_paths,
        scores=scores if results_visible else [0] * len(category.options),
        already_voted=already_voted,
        nomination_open=is_nominations_open(ts),
        voting_open=is_voting_open(ts),
        results_visible=results_visible,
        already_nominated=already_nominated,
    )
