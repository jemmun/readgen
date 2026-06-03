from sqlalchemy import Column, Integer, Float, DateTime, Text, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Tip(Base):
    __tablename__ = "tips"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    novel_id = Column(Integer, ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)  # Tip amount in virtual currency
    message = Column(Text, nullable=True)  # Optional message with tip
    currency_type = Column(String(20), default="coins")  # coins, gems, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
    novel = relationship("Novel")
    chapter = relationship("Chapter")
