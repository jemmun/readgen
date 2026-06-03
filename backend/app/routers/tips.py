from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.novel import Novel
from app.models.user import User
from app.services.tip_service import tip_service
from app.core.security import get_current_user_required

router = APIRouter(prefix="/tips", tags=["tips"])


class CreateTipRequest(BaseModel):
    novel_id: int
    chapter_id: Optional[int] = None
    amount: float
    message: Optional[str] = None
    currency_type: Optional[str] = "coins"


@router.post("")
def create_tip(
    data: CreateTipRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Create a tip for a novel/author."""
    # Get novel to find author
    novel = db.query(Novel).filter(Novel.id == data.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    # Prevent self-tipping
    if novel.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot tip your own novel")

    try:
        tip = tip_service.create_tip(
            db=db,
            from_user_id=current_user.id,
            to_user_id=novel.user_id,
            novel_id=data.novel_id,
            amount=data.amount,
            chapter_id=data.chapter_id,
            message=data.message,
            currency_type=data.currency_type,
        )
        return {
            "id": tip.id,
            "amount": tip.amount,
            "message": tip.message,
            "created_at": tip.created_at.isoformat() if tip.created_at else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/novel/{novel_id}")
def get_novel_tips(
    novel_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get tips for a specific novel."""
    tips = tip_service.get_novel_tips(db=db, novel_id=novel_id, limit=limit)
    return {"tips": tips, "total": len(tips)}


@router.get("/novel/{novel_id}/stats")
def get_novel_tip_stats(
    novel_id: int,
    db: Session = Depends(get_db),
):
    """Get tip statistics for a novel."""
    stats = tip_service.get_novel_tip_stats(db=db, novel_id=novel_id)
    return stats


@router.get("/user/stats")
def get_user_tip_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get tip statistics for current user (as author)."""
    stats = tip_service.get_user_tip_stats(db=db, user_id=current_user.id)
    return stats


@router.get("/trending")
def get_trending_tipped_novels(
    limit: int = Query(default=10, ge=1, le=20),
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Get novels with most tips recently."""
    novels = tip_service.get_trending_tipped_novels(
        db=db,
        limit=limit,
        days=days,
    )
    return {"novels": novels}
