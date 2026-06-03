from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class GenerationSessionCreate(BaseModel):
    novel_id: int
    session_type: str = "initial"
    user_direction: Optional[str] = None


class UserInteractionCreate(BaseModel):
    session_id: int
    interaction_type: str
    content: str


class UserInteractionInDB(BaseModel):
    id: int
    session_id: int
    interaction_type: str
    content: str
    applied_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class GenerationSessionInDB(BaseModel):
    id: int
    novel_id: int
    session_type: str
    context_summary: Optional[str]
    user_direction: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    interactions: List[UserInteractionInDB] = []

    class Config:
        from_attributes = True


class GenerationStartResponse(BaseModel):
    session_id: int
    novel_id: int
    status: str
    message: str
    outline: str


class GenerationContinueRequest(BaseModel):
    user_direction: Optional[str] = None


class ChapterGeneratedResponse(BaseModel):
    chapter_id: int
    chapter_number: int
    title: str
    word_count: int
    content: str
    novel_status: str
    total_word_count: int
