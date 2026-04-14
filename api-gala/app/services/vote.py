import difflib
from typing import List, Optional
from app.core.db.types import DBType
from app.models.vote import VoteCategory, Nominee, Vote


class VoteService:
    @staticmethod
    async def nominate(db: DBType, user_id: int, category_id: int, nominee_name: str) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            raise ValueError("Category not found")
            
        category = VoteCategory.parse_obj(category_dict)
        if not category.nomination_open:
            raise ValueError("Nominations are closed for this category")

        # Check if user already nominated in this category
        for n in category.nominations:
            if user_id in n.votes:
                raise ValueError("You have already nominated someone in this category")

        # Check for similar names (fuzzy match)
        # This is just for the "Suggest similar names" part in requirements.
        # Actually, if the user picks a suggestion, it will be the exact name.
        # If they type a new one, we add it.
        
        found = False
        for n in category.nominations:
            if n.name.lower() == nominee_name.lower():
                n.votes.append(user_id)
                found = True
                break
        
        if not found:
            category.nominations.append(Nominee(name=nominee_name, votes=[user_id]))

        await collection.update_one(
            {"_id": category_id},
            {"$set": {"nominations": [n.dict() for n in category.nominations]}}
        )
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
            raise ValueError("Voting is closed for this category")

        # One vote per user
        if any(v.uid == user_id for v in category.votes):
            raise ValueError("You have already voted in this category")

        if option_index < 0 or option_index >= len(category.options):
            raise ValueError("Invalid option index")

        vote_obj = Vote(uid=user_id, option=option_index)
        await collection.update_one(
            {"_id": category_id},
            {"$push": {"votes": vote_obj.dict()}}
        )
        return True

    @staticmethod
    async def merge_nominees(db: DBType, category_id: int, target_name: str, source_names: List[str]) -> bool:
        """Admin tool to merge multiple nominee entries into one target."""
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
    async def finalize_nominations(db: DBType, category_id: int) -> bool:
        """Move top 4 nominees to actual voting options."""
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            return False
            
        category = VoteCategory.parse_obj(category_dict)
        
        # Sort by count desc
        sorted_nominations = sorted(category.nominations, key=lambda x: len(x.votes), reverse=True)
        top_4 = sorted_nominations[:4]
        
        category.options = [n.name for n in top_4]
        category.nomination_open = False
        category.voting_open = True
        
        await collection.update_one(
            {"_id": category_id},
            {"$set": {
                "options": category.options,
                "nomination_open": False,
                "voting_open": True
            }}
        )
        return True
