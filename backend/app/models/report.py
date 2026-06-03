from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)  # "post" or "comment"
    target_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, reviewed, dismissed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", back_populates="reports")
