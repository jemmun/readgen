from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_private = Column(Boolean, default=True)
    announcement = Column(Text, nullable=True)  # E-P5: group announcement
    invite_code = Column(String(50), nullable=True, unique=True)  # E-P4: invite link code
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="owned_groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="group")
