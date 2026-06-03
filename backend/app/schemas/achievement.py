from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AchievementOut(BaseModel):
    id: int
    key: str
    name: str
    description: str
    icon: str
    category: str
    requirement_type: str
    requirement_value: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserAchievementOut(BaseModel):
    id: int
    key: str
    name: str
    description: str
    icon: str
    category: str
    requirement_type: str
    requirement_value: int
    created_at: datetime
    user_achievement_id: Optional[int] = None
    progress: int = 0
    is_unlocked: bool = False
    unlocked_at: Optional[datetime] = None

    class Config:
        from_attributes = True
