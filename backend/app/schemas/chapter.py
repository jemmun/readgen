from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ChapterBase(BaseModel):
    chapter_number: int
    title: str
    content: str


class ChapterCreate(ChapterBase):
    novel_id: int


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None


class ChapterInDB(ChapterBase):
    id: int
    novel_id: int
    word_count: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
