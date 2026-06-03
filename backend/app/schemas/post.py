from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import json


class PostBase(BaseModel):
    content: str


class PostCreate(PostBase):
    tag: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None  # Multi-image support
    group_id: Optional[int] = None
    status: Optional[str] = None
    allow_comments: bool = True
    allow_repost: bool = True
    allow_share: bool = True
    repost_of: Optional[int] = None


class PostUpdate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None  # Multi-image support


class PostAuthor(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class RepostSource(BaseModel):
    """Lightweight original-post embed for reposts."""
    id: int
    user_id: int
    content: str
    created_at: datetime
    author: Optional[PostAuthor] = None

    class Config:
        from_attributes = True


class PostInDB(PostBase):
    id: int
    user_id: int
    novel_id: Optional[int] = None
    group_id: Optional[int] = None
    tag: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None  # Multi-image support
    status: str = "approved"
    allow_comments: bool = True
    allow_repost: bool = True
    allow_share: bool = True
    repost_of: Optional[int] = None
    repost_count: int = 0
    original_post: Optional[RepostSource] = None
    reposters: list[PostAuthor] = []
    likers: list[PostAuthor] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: Optional[PostAuthor] = None
    like_count: int = 0
    comment_count: int = 0
    is_liked_by_me: bool = False

    class Config:
        from_attributes = True
