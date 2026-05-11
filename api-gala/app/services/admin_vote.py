from typing import List
from app.core.db.types import DBType
from app.models.vote import VoteCategory, Nominee


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
    async def finalize_nominations(db: DBType, category_id: int) -> bool:
        collection = VoteCategory.get_collection(db)
        category_dict = await collection.find_one({"_id": category_id})
        if not category_dict:
            return False

        category = VoteCategory.parse_obj(category_dict)

        if not category.nominations:
            return False

        sorted_nominations = sorted(category.nominations, key=lambda x: len(x.votes), reverse=True)
        top_4 = sorted_nominations[:4]

        await collection.update_one(
            {"_id": category_id},
            {"$set": {"options": [n.name for n in top_4]}}
        )
        return True
