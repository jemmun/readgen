from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.report import Report
from app.models.user import User
from app.core.security import get_current_user_required
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportCreate(BaseModel):
    target_type: str  # "post" or "comment"
    target_id: int
    reason: Optional[str] = None


class ReportInDB(BaseModel):
    id: int
    reporter_id: int
    target_type: str
    target_id: int
    reason: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=ReportInDB)
def create_report(
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Report a post or comment for inappropriate content."""
    # Validate target_type
    if data.target_type not in ["post", "comment"]:
        raise HTTPException(status_code=400, detail="Invalid target type. Must be 'post' or 'comment'")
    
    # Check if user already reported this
    existing = db.query(Report).filter(
        Report.reporter_id == current_user.id,
        Report.target_type == data.target_type,
        Report.target_id == data.target_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already reported this content")
    
    report = Report(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/mine", response_model=List[ReportInDB])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get all reports submitted by current user."""
    return db.query(Report).filter(
        Report.reporter_id == current_user.id
    ).order_by(Report.created_at.desc()).all()
