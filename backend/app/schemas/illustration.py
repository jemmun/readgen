from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class IllustrationCreate(BaseModel):
    prompt: str
    style: str = "realistic"
    size: str = "1024x1024"
    illustration_type: str = "illustration"  # cover, illustration


class IllustrationUpdate(BaseModel):
    """Fields that can be edited after generation."""
    description: Optional[str] = None
    tags: Optional[str] = None
    novel_id: Optional[int] = None
    illustration_type: Optional[str] = None


class IllustrationInDB(BaseModel):
    id: int
    user_id: int
    prompt: str
    style: str
    size: str
    image_url: Optional[str] = None
    status: str
    description: Optional[str] = None
    tags: Optional[str] = None
    novel_id: Optional[int] = None
    illustration_type: str = "illustration"
    created_at: datetime

    class Config:
        from_attributes = True
