from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, nullable=False)  # emoji or icon name
    category = Column(String, nullable=False)  # writing, reading, social, collaboration
    
    # Requirement to unlock
    requirement_type = Column(String, nullable=False)  # count, threshold, milestone
    requirement_value = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    progress = Column(Integer, default=0)  # Current progress towards requirement
    is_unlocked = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", backref="user_achievements")
    achievement = relationship("Achievement", backref="user_achievements")
