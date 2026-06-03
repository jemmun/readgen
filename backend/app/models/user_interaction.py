from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("generation_sessions.id", ondelete="CASCADE"), nullable=False)
    interaction_type = Column(String(50), nullable=False)  # feedback, direction, rewrite
    content = Column(Text, nullable=False)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("GenerationSession", back_populates="interactions")
