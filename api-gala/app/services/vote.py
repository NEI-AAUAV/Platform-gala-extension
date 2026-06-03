import difflib
import re
from datetime import datetime, timezone
from typing import List, Optional
from app.core.db.types import DBType
from app.models.user import User
from app.models.vote import VoteCategory, Vote


class AlreadyNominatedError(ValueError): ...
class AlreadyVotedError(ValueError): ...


class VoteService:
    @staticmethod
    def _add_split_names(target: List[str], name: Optional[str]) -> None:
        if not name:
            return
        if " & " in name:
            target.extend(part.strip() for part in name.split(" & ") if part.strip())
            return
        cleaned = name.strip()
        if cleaned:
            target.append(cleaned)

    @staticmethod
    async def nominate(db: DBType, user_id: int, category_id: int, names: List[str]) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")

        category = VoteCategory.parse_obj(category_dict)

        if getattr(category, "is_hidden", False):
            raise ValueError("Category not found")

        if category.reveal_at:
            reveal_at_utc = category.reveal_at if category.reveal_at.tzinfo is not None else category.reveal_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < reveal_at_utc:
                raise ValueError("Category not found")

        # Filter out empty names and strip whitespace
        names = [n.strip() for n in names if n.strip()]

        if not (category.min_nominees <= len(names) <= category.max_nominees):
            if category.min_nominees == category.max_nominees:
                raise ValueError(f"Esta categoria requer exatamente {category.min_nominees} nomes")
            raise ValueError(f"Esta categoria requer entre {category.min_nominees} e {category.max_nominees} nomes")

        # Sort names and join with " & " for consistent group naming
        nominee_name = " & ".join(sorted(names))

        # If the user already nominated, remove their vote from the current nominee first.
        existing_nominee = next(
            (n for n in category.nominations if user_id in n.votes), None
        )
        if existing_nominee:
            if len(existing_nominee.votes) == 1:
                await collection.update_one(
                    {"_id": category_id},
                    {"$pull": {"nominations": {"name": existing_nominee.name}}},
                )
            else:
                await collection.update_one(
                    {"_id": category_id, "nominations.name": existing_nominee.name},
                    {"$pull": {"nominations.$.votes": user_id}},
                )
            category_dict = await collection.find_one({"_id": category_id})
            category = VoteCategory.parse_obj(category_dict)

        # Case-insensitive match against existing nominees
        existing_name = next(
            (n.name for n in category.nominations if n.name.lower() == nominee_name.lower()),
            None,
        )

        no_double_vote = {"$not": {"$elemMatch": {"votes": user_id}}}
        if existing_name:
            result = await collection.update_one(
                {
                    "_id": category_id,
                    "nominations.name": existing_name,
                    "nominations": no_double_vote,
                },
                {"$push": {"nominations.$.votes": user_id}},
            )
        else:
            result = await collection.update_one(
                {
                    "_id": category_id,
                    "nominations": no_double_vote,
                },
                {"$push": {"nominations": {"name": nominee_name, "votes": [user_id]}}},
            )

        if result.modified_count == 0:
            raise AlreadyNominatedError("You have already nominated someone in this category")
        return True

    @staticmethod
    async def get_suggestions(db: DBType, category_id: int, query: str) -> List[str]:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            return []

        category = VoteCategory.parse_obj(category_dict)
        if getattr(category, "is_hidden", False):
            return []
        if category.reveal_at:
            reveal_at_utc = category.reveal_at if category.reveal_at.tzinfo is not None else category.reveal_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < reveal_at_utc:
                return []

        escaped_query = re.escape(query.strip())
        if not escaped_query:
            return []
        query_regex = {"$regex": escaped_query, "$options": "i"}

        users_collection = User.get_collection(db)
        users_cursor = users_collection.find(
            {"$or": [{"name": query_regex}, {"companions.name": query_regex}]},
            projection={"name": 1, "companions.name": 1},
        )
        users = await users_cursor.to_list(None)

        categories = await collection.find(
            {"nominations.name": query_regex},
            projection={"nominations": {"$elemMatch": {"name": query_regex}}},
        ).to_list(None)

        all_names: List[str] = []

        for user in users:
            VoteService._add_split_names(all_names, user.get("name"))

            for companion in user.get("companions", []):
                companion_name = companion.get("name")
                if companion_name and re.search(escaped_query, companion_name, re.IGNORECASE):
                    VoteService._add_split_names(all_names, companion_name)

        for category in categories:
            for nomination in category.get("nominations", []):
                VoteService._add_split_names(all_names, nomination.get("name"))

        deduped_map = {}
        for name in all_names:
            normalized = name.casefold()
            if normalized not in deduped_map:
                deduped_map[normalized] = name

        candidates = list(deduped_map.values())
        query_folded = query.casefold()
        direct_matches = [
            name for name in candidates if query_folded in name.casefold()
        ]
        direct_matches.sort(
            key=lambda name: (
                not name.casefold().startswith(query_folded),
                len(name),
                name.casefold(),
            )
        )
        if len(direct_matches) >= 5:
            return direct_matches[:5]

        fuzzy_matches = difflib.get_close_matches(
            query, candidates, n=5, cutoff=0.3
        )
        results = []
        seen = set()
        for name in direct_matches + fuzzy_matches:
            normalized = name.casefold()
            if normalized in seen:
                continue
            seen.add(normalized)
            results.append(name)
            if len(results) == 5:
                break
        return results

    @staticmethod
    async def vote(db: DBType, user_id: int, category_id: int, option_index: int) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")

        category = VoteCategory.parse_obj(category_dict)

        if getattr(category, "is_hidden", False):
            raise ValueError("Category not found")

        if category.reveal_at:
            reveal_at_utc = category.reveal_at if category.reveal_at.tzinfo is not None else category.reveal_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < reveal_at_utc:
                raise ValueError("Category not found")

        if option_index < 0 or option_index >= len(category.options):
            raise ValueError("Invalid option index")

        vote_obj = Vote(uid=user_id, option=option_index)
        result = await collection.update_one(
            {"_id": category_id, "votes.uid": {"$ne": user_id}},
            {"$push": {"votes": vote_obj.dict()}},
        )
        if result.modified_count == 0:
            raise AlreadyVotedError("You have already voted in this category")
        return True
