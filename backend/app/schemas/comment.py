from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    tag: Optional[str] = None
    parent_id: Optional[int] = None


class CommentAuthor(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class CommentInDB(CommentBase):
    id: int
    post_id: int
    user_id: int
    content: str
    tag: Optional[str] = None
    parent_id: Optional[int] = None
    adopted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: Optional[CommentAuthor] = None

    class Config:
        from_attributes = True
