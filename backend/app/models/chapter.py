from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    contributor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="SET NULL"), nullable=True)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    status = Column(String(50), default="generated")  # generated, edited, locked
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    novel = relationship("Novel", back_populates="chapters")
    contributor = relationship("User")
