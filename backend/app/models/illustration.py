from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Illustration(Base):
    __tablename__ = "illustrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prompt = Column(Text, nullable=False)
    style = Column(String(100), default="realistic")
    size = Column(String(50), default="1024x1024")
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), default="pending")  # pending, completed, failed
    description = Column(Text, nullable=True)  # User-editable description/caption
    tags = Column(String(500), nullable=True)  # Comma-separated tags
    novel_id = Column(Integer, ForeignKey("novels.id"), nullable=True)  # Associated novel
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)  # Associated chapter (A-P1)
    illustration_type = Column(String(50), default="illustration")  # cover, illustration
    style_seed = Column(String(100), nullable=True)  # Style consistency seed for batch generation (A-P3)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    novel = relationship("Novel")
    chapter = relationship("Chapter")
