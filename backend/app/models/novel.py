from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Novel(Base):
    __tablename__ = "novels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    theme_description = Column(Text, nullable=False)
    genre = Column(String(100), nullable=True)
    style = Column(Text, nullable=True)
    target_audience = Column(Text, nullable=True)
    protagonist_info = Column(Text, nullable=True)
    setting = Column(Text, nullable=True)
    tone = Column(Text, nullable=True)
    language = Column(String(10), default="en")
    max_chapters = Column(Integer, default=20)
    total_word_count = Column(Integer, default=0)
    status = Column(String(50), default="draft")  # draft, generating, active, completed
    is_published = Column(Boolean, default=False)
    cover_image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    author = relationship("User", back_populates="novels")
