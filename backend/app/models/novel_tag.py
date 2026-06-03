from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class NovelTag(Base):
    __tablename__ = "novel_tags"

    id = Column(Integer, primary_key=True, index=True)
    novel_id = Column(Integer, ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    tag = Column(String(50), nullable=False)

    novel = relationship("Novel", back_populates="tags")
