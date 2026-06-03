from datetime import datetime, timezone
from typing import List, Optional
from app.core.db.types import DBType
from app.core.db.counters import get_next_vote_category_id
from app.models.vote import VoteCategory, Nominee


def _valid_vote_window(votes_start: Optional[datetime], votes_end: Optional[datetime]) -> bool:
    if votes_start is None and votes_end is None:
        return True
    if votes_start is None or votes_end is None:
        return False
    start = votes_start if votes_start.tzinfo is not None else votes_start.replace(tzinfo=timezone.utc)
    end = votes_end if votes_end.tzinfo is not None else votes_end.replace(tzinfo=timezone.utc)
    return start < end


class AdminVoteService:
    @staticmethod
    async def merge_nominees(db: DBType, category_id: int, target_name: str, source_names: List[str]) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            return False

        category = VoteCategory.parse_obj(category_dict)

        target_nominee = next((n for n in category.nominations if n.name == target_name), None)
        if not target_nominee:
            target_nominee = Nominee(name=target_name, votes=[])
            category.nominations.append(target_nominee)

        all_votes = set(target_nominee.votes)

        new_nominations = []
        for n in category.nominations:
            if n.name in source_names:
                all_votes.update(n.votes)
            elif n.name == target_name:
                continue
            else:
                new_nominations.append(n)

        target_nominee.votes = list(all_votes)
        new_nominations.append(target_nominee)

        await collection.update_one(
            {"_id": category_id},
            {"$set": {"nominations": [n.dict() for n in new_nominations]}}
        )
        return True

    @staticmethod
    async def finalize_nominations(db: DBType, category_id: int, selected_names: Optional[List[str]] = None) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            return False

        category = VoteCategory.parse_obj(category_dict)

        if not category.nominations:
            return False

        if selected_names is not None:
            available_names = {n.name for n in category.nominations}
            cleaned_names = []
            for name in selected_names:
                if name not in available_names or name in cleaned_names:
                    return False
                cleaned_names.append(name)

            if not (1 <= len(cleaned_names) <= 4):
                return False

            options = cleaned_names
        else:
            sorted_nominations = sorted(category.nominations, key=lambda x: len(x.votes), reverse=True)
            options = [n.name for n in sorted_nominations[:4]]

        await collection.update_one(
            {"_id": category_id},
            {"$set": {"options": options}}
        )
        return True

    @staticmethod
    async def create_runoff_category(
        db: DBType,
        source_category_id: int,
        nominee_names: List[str],
        slots: int,
        votes_start: Optional[datetime] = None,
        votes_end: Optional[datetime] = None,
    ) -> Optional[VoteCategory]:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": source_category_id})
        if not category_dict:
            return None

        source = VoteCategory.parse_obj(category_dict)
        available_names = {n.name for n in source.nominations}
        cleaned_names = []
        for name in nominee_names:
            if name not in available_names or name in cleaned_names:
                return None
            cleaned_names.append(name)

        if len(cleaned_names) < 2 or slots < 1 or slots >= len(cleaned_names):
            return None
        if not _valid_vote_window(votes_start, votes_end):
            return None

        category_id = await get_next_vote_category_id(db)
        category = VoteCategory(
            _id=category_id,
            category=f"Desempate - {source.category}",
            description=f"2.ª volta para escolher {slots} de {len(cleaned_names)} nomeados empatados.",
            min_nominees=source.min_nominees,
            max_nominees=source.max_nominees,
            reveal_at=source.reveal_at,
            votes_start=votes_start,
            votes_end=votes_end,
            is_hidden=source.is_hidden,
            results_visible=source.results_visible,
            nominations=[],
            options=cleaned_names,
            photo_paths=["" for _ in cleaned_names],
            votes=[],
        )

        await collection.insert_one(category.dict(by_alias=True))
        return category

    @staticmethod
    async def create_vote_runoff_category(
        db: DBType,
        source_category_id: int,
        votes_start: Optional[datetime] = None,
        votes_end: Optional[datetime] = None,
    ) -> Optional[VoteCategory]:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": source_category_id})
        if not category_dict:
            return None

        source = VoteCategory.parse_obj(category_dict)
        if len(source.options) < 2:
            return None
        if not _valid_vote_window(votes_start, votes_end):
            return None

        scores = [0] * len(source.options)
        for vote in source.votes:
            if 0 <= vote.option < len(scores):
                scores[vote.option] += 1

        if not scores:
            return None

        top_score = max(scores)
        if top_score == 0:
            return None

        tied_indexes = [
            index for index, score in enumerate(scores) if score == top_score
        ]
        if len(tied_indexes) < 2:
            return None

        options = [source.options[index] for index in tied_indexes]
        photo_paths = [
            source.photo_paths[index] if index < len(source.photo_paths) else ""
            for index in tied_indexes
        ]

        category_id = await get_next_vote_category_id(db)
        category = VoteCategory(
            _id=category_id,
            category=f"Desempate - {source.category}",
            description=f"2.ª volta para decidir o vencedor entre {len(options)} opções empatadas com {top_score} votos.",
            min_nominees=source.min_nominees,
            max_nominees=source.max_nominees,
            reveal_at=source.reveal_at,
            votes_start=votes_start,
            votes_end=votes_end,
            is_hidden=source.is_hidden,
            results_visible=source.results_visible,
            nominations=[],
            options=options,
            photo_paths=photo_paths,
            votes=[],
        )

        await collection.insert_one(category.dict(by_alias=True))
        return category
