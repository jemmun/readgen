from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.core.security import get_current_user, get_current_user_required
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    category: str  # "bug", "feature", "general"
    content: str


class FeedbackInDB(BaseModel):
    id: int
    user_id: Optional[int]
    category: str
    content: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=FeedbackInDB)
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Submit user feedback (bug report, feature request, or general feedback)."""
    if data.category not in ["bug", "feature", "general"]:
        raise HTTPException(status_code=400, detail="Invalid category. Must be 'bug', 'feature', or 'general'")
    
    feedback = Feedback(
        user_id=current_user.id if current_user else None,
        category=data.category,
        content=data.content,
        status="open",
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/mine", response_model=List[FeedbackInDB])
def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get all feedback submitted by current user."""
    return db.query(Feedback).filter(
        Feedback.user_id == current_user.id
    ).order_by(Feedback.created_at.desc()).all()
