from sqlalchemy.orm import relationship
from .user import User
from .novel import Novel
from .chapter import Chapter
from .generation_session import GenerationSession
from .user_interaction import UserInteraction
from .post import Post
from .comment import Comment
from .follow import Follow
from .like import Like
from .group import Group
from .group_member import GroupMember
from .illustration import Illustration
from .novel_review import NovelReview
from .novel_tag import NovelTag
from .report import Report
from .feedback import Feedback
from .bookmark import Bookmark
from .reading_progress import ReadingProgress
from .notification import Notification
from .message import Message
from .qr_token import QRToken
from .achievement import Achievement, UserAchievement
from .tip import Tip

Novel.chapters = relationship("Chapter", order_by="Chapter.chapter_number", back_populates="novel")
Novel.generation_sessions = relationship("GenerationSession", order_by="GenerationSession.created_at", back_populates="novel")
Novel.reviews = relationship("NovelReview", back_populates="novel", cascade="all, delete-orphan")
Novel.tags = relationship("NovelTag", back_populates="novel", cascade="all, delete-orphan")
Post.comments = relationship("Comment", order_by="Comment.created_at", back_populates="post")
Post.likes = relationship("Like", back_populates="post")
User.reviews = relationship("NovelReview", back_populates="author", cascade="all, delete-orphan")
User.reports = relationship("Report", back_populates="reporter", cascade="all, delete-orphan")
User.feedback = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
User.tips_sent = relationship("Tip", foreign_keys="Tip.from_user_id", back_populates="from_user", cascade="all, delete-orphan")
User.tips_received = relationship("Tip", foreign_keys="Tip.to_user_id", back_populates="to_user", cascade="all, delete-orphan")
Novel.tips = relationship("Tip", back_populates="novel", cascade="all, delete-orphan")
