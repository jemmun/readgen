from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, field_validator

from .chapter import ChapterInDB


# Valid genre types for novel creation
VALID_GENRES = [
    "historical", "wuxia", "romance", "scifi", "fantasy",
    "xuanhuan", "urban", "xianxia", "apocalyptic", "military",
    "detective", "supernatural"
]


class NovelBase(BaseModel):
    """Shared fields for input & output — no validation (DB may contain legacy data)."""
    title: str
    theme_description: str
    genre: Optional[str] = None
    style: Optional[str] = None
    target_audience: Optional[str] = None
    protagonist_info: Optional[str] = None
    setting: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = "en"
    max_chapters: int = 20


class NovelCreate(NovelBase):
    """Create schema — validates genre."""
    @field_validator('genre')
    @classmethod
    def validate_genre(cls, v):
        if v is not None and v not in VALID_GENRES:
            raise ValueError(f'Invalid genre. Must be one of: {", ".join(VALID_GENRES)}')
        return v


class NovelUpdate(BaseModel):
    """Update schema — validates genre."""
    title: Optional[str] = None
    theme_description: Optional[str] = None
    genre: Optional[str] = None
    style: Optional[str] = None
    target_audience: Optional[str] = None
    protagonist_info: Optional[str] = None
    setting: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    max_chapters: Optional[int] = None
    status: Optional[str] = None
    is_published: Optional[bool] = None
    cover_image_url: Optional[str] = None

    @field_validator('genre')
    @classmethod
    def validate_genre(cls, v):
        if v is not None and v not in VALID_GENRES:
            raise ValueError(f'Invalid genre. Must be one of: {", ".join(VALID_GENRES)}')
        return v


class NovelInDB(NovelBase):
    """Response schema — no validation (read-only)."""
    id: int
    total_word_count: int
    status: str
    is_published: bool = False
    cover_image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NovelDetail(NovelInDB):
    chapters: List[ChapterInDB] = []
