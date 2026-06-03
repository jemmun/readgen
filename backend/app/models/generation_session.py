from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class GenerationSession(Base):
    __tablename__ = "generation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    session_type = Column(String(50), nullable=False)  # initial, continue
    context_summary = Column(Text, nullable=True)
    user_direction = Column(Text, nullable=True)
    outline = Column(Text, nullable=True)
    status = Column(String(50), default="active")  # active, completed, failed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    novel = relationship("Novel", back_populates="generation_sessions")
    interactions = relationship("UserInteraction", back_populates="session", cascade="all, delete-orphan")
