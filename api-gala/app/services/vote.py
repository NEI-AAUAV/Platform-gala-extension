import difflib
from typing import List, Optional
from app.core.db.types import DBType
from app.models.vote import VoteCategory, Vote


class NominationsClosedError(ValueError): ...
class AlreadyNominatedError(ValueError): ...
class VotingClosedError(ValueError): ...
class AlreadyVotedError(ValueError): ...


class VoteService:
    @staticmethod
    async def nominate(db: DBType, user_id: int, category_id: int, nominee_name: str) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")

        category = VoteCategory.parse_obj(category_dict)
        if not category.nomination_open:
            raise NominationsClosedError("Nominations are closed for this category")

        # Pre-flight check (advisory; the atomic write below is the real guard)
        if any(user_id in n.votes for n in category.nominations):
            raise AlreadyNominatedError("You have already nominated someone in this category")

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
                    "nomination_open": True,
                    "nominations.name": existing_name,
                    "nominations": no_double_vote,
                },
                {"$push": {"nominations.$.votes": user_id}},
            )
        else:
            result = await collection.update_one(
                {
                    "_id": category_id,
                    "nomination_open": True,
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
        names = [n.name for n in category.nominations]
        
        # Use difflib for fuzzy matching
        return difflib.get_close_matches(query, names, n=5, cutoff=0.3)

    @staticmethod
    async def vote(db: DBType, user_id: int, category_id: int, option_index: int) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")

        category = VoteCategory.parse_obj(category_dict)
        if not category.voting_open:
            raise VotingClosedError("Voting is closed for this category")

        if option_index < 0 or option_index >= len(category.options):
            raise ValueError("Invalid option index")

        vote_obj = Vote(uid=user_id, option=option_index)
        result = await collection.update_one(
            {"_id": category_id, "voting_open": True, "votes.uid": {"$ne": user_id}},
            {"$push": {"votes": vote_obj.dict()}},
        )
        if result.modified_count == 0:
            raise AlreadyVotedError("You have already voted in this category")
        return True

