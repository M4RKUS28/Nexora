from typing import List, Optional

from pydantic import BaseModel, Field


class FlashcardRequest(BaseModel):
    """Request schema for creating a Flashcard Deck."""
    title: str = Field(..., description="Title of the Flashcard Deck")
    type: str = Field(..., description="Learning or Testing Deck")
    description: str = Field(..., description="Description of the Flashcard Deck")
    document_ids: List[int] = Field(default=[], description="Document IDs")
    difficulty: str = Field(..., description="Difficulty")


class FlashcardInfo(BaseModel):
    """Schema for a list of courses."""
    deck_id: int
    status: str

    # Information from the agent
    deck_id: int
    title: Optional[str] = None
    flashcard_count: Optional[int] = None
    completed_flashcard_count: Optional[int] = None
    user_name: Optional[str] = None
