from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import json


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)  # Legacy single image (backward compat)
    image_urls = Column(Text, nullable=True)  # JSON array of image URLs for multi-image posts
    tag = Column(String(50), nullable=True)  # slash-command tag slug, e.g. "plot", "character"
    status = Column(String(20), default="approved", nullable=False)  # pending, approved, rejected
    approval_note = Column(Text, nullable=True)  # admin annotation when approving/rejecting
    allow_comments = Column(Boolean, default=True)  # user can toggle
    allow_repost = Column(Boolean, default=True)
    allow_share = Column(Boolean, default=True)
    repost_of = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)  # original post if this is a repost
    novel_id = Column(Integer, ForeignKey("novels.id", ondelete="SET NULL"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")
    group = relationship("Group", back_populates="posts")
    original_post = relationship("Post", remote_side=[id], backref="reposts")
