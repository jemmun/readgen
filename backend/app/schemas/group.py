from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = True


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None


class GroupMemberCreate(BaseModel):
    user_id: Optional[int] = None
    role: str = "member"


class GroupAuthor(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class GroupInDB(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    is_private: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner: Optional[GroupAuthor] = None
    member_count: int = 0

    class Config:
        from_attributes = True
