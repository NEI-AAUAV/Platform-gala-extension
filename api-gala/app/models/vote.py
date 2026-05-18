from typing import List, Optional
from pydantic import BaseModel, Field
from app.models import BaseDocument


class Nominee(BaseModel):
    name: str
    votes: List[int] = [] # User IDs who nominated this name
    
    @property
    def count(self) -> int:
        return len(self.votes)


class Vote(BaseModel):
    uid: int
    option: int


class VoteCategory(BaseDocument):
    id: int = Field(alias="_id")
    category: str
    description: Optional[str] = None
    min_nominees: int = 1
    max_nominees: int = 1

    # Nominations (free text)
    nominations: List[Nominee] = []

    # Voting (once top 4 are fixed)
    options: List[str] = Field(default_factory=list)
    photo_paths: List[str] = Field(default_factory=list)
    votes: List[Vote] = Field(default_factory=list)


class VoteListing(BaseModel):
    id: int = Field(alias="_id")
    category: str
    description: Optional[str] = None
    options: List[str]
    photo_paths: List[str] = Field(default_factory=list)
    scores: List[int]
    already_voted: Optional[int] = None
    
    # Phase state for frontend
    nomination_open: bool
    voting_open: bool
    results_visible: bool = False
    already_nominated: bool = False
    min_nominees: int = 1
    max_nominees: int = 1
