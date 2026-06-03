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


def is_voting_open(ts: TimeSlots, category: VoteCategory = None) -> bool:
    votes_start = category.votes_start if category and category.votes_start else ts.votes_start
    votes_end = category.votes_end if category and category.votes_end else ts.votes_end
    if votes_start is None or votes_end is None:
        return False
    now = _now()
    return _ensure_utc(votes_start) <= now <= _ensure_utc(votes_end)


def anonymize_category(
    category: VoteCategory,
    auth: AuthData,
    ts: TimeSlots,
    results_visible: bool = False,
) -> VoteListing:
    # Check if category is revealed
    now = _now()
    revealed = True
    
    if getattr(category, "is_hidden", False):
        revealed = False
    elif category.reveal_at:
        reveal_at_utc = _ensure_utc(category.reveal_at)
        if now < reveal_at_utc:
            revealed = False

    already_voted = None
    scores = [0] * len(category.options)

    for vote in category.votes:
        if 0 <= vote.option < len(scores):
            scores[vote.option] += 1
        if vote.uid == auth.sub:
            already_voted = vote.option

    already_nominated = any(auth.sub in n.votes for n in category.nominations)
    category_results_visible = (
        results_visible and getattr(category, "results_visible", False) and revealed
    )

    return VoteListing(
        _id=category.id,
        category=category.category,
        description=category.description,
        options=category.options if revealed else [],
        photo_paths=category.photo_paths if revealed else [],
        scores=scores if category_results_visible else [0] * len(category.options),
        already_voted=already_voted,
        reveal_at=category.reveal_at,
        votes_start=category.votes_start,
        votes_end=category.votes_end,
        revealed=revealed,
        is_hidden=getattr(category, "is_hidden", False),
        nomination_open=is_nominations_open(ts) if revealed else False,
        voting_open=is_voting_open(ts, category) if revealed else False,
        results_visible=category_results_visible,
        already_nominated=already_nominated,
        min_nominees=category.min_nominees,
        max_nominees=category.max_nominees,
    )
