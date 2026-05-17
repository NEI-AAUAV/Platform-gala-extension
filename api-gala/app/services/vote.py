import difflib
from typing import List, Optional
from app.core.db.types import DBType
from app.models.user import User
from app.models.vote import VoteCategory, Vote


class AlreadyNominatedError(ValueError): ...
class AlreadyVotedError(ValueError): ...


class VoteService:
    @staticmethod
    async def nominate(db: DBType, user_id: int, category_id: int, nominee_name: str) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")

        category = VoteCategory.parse_obj(category_dict)

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

        users_collection = User.get_collection(db)
        users_cursor = users_collection.find(
            {},
            projection={"name": 1, "companions.name": 1},
        )
        users = await users_cursor.to_list(None)

        categories = await collection.find({}, projection={"nominations.name": 1}).to_list(None)

        all_names: List[str] = []
        for user in users:
            user_name = user.get("name")
            if user_name:
                all_names.append(user_name)

            for companion in user.get("companions", []):
                companion_name = companion.get("name")
                if companion_name:
                    all_names.append(companion_name)

        for category in categories:
            for nomination in category.get("nominations", []):
                nominee_name = nomination.get("name")
                if nominee_name:
                    all_names.append(nominee_name)

        deduped_map = {}
        for name in all_names:
            cleaned = name.strip()
            if not cleaned:
                continue
            normalized = cleaned.casefold()
            if normalized not in deduped_map:
                deduped_map[normalized] = cleaned

        return difflib.get_close_matches(query, list(deduped_map.values()), n=5, cutoff=0.3)

    @staticmethod
    async def vote(db: DBType, user_id: int, category_id: int, option_index: int) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")

        category = VoteCategory.parse_obj(category_dict)

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
