from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.novel import Novel
from app.models.user import User
from app.services.plot_conflict_service import plot_conflict_detector
from app.core.security import get_current_user_required

router = APIRouter(prefix="/plot-conflicts", tags=["plot-conflicts"])


class ConflictDetectionRequest(BaseModel):
    novel_id: int
    language: Optional[str] = "en"


class CharacterConsistencyRequest(BaseModel):
    novel_id: int
    character_name: str
    language: Optional[str] = "en"


@router.post("/detect")
async def detect_plot_conflicts(
    data: ConflictDetectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Detect plot conflicts in a novel."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await plot_conflict_detector.detect_plot_conflicts(
        db=db,
        novel_id=data.novel_id,
        language=data.language,
    )
    return result


@router.post("/character-consistency")
async def check_character_consistency(
    data: CharacterConsistencyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Check character consistency throughout the novel."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await plot_conflict_detector.check_character_consistency(
        db=db,
        novel_id=data.novel_id,
        character_name=data.character_name,
        language=data.language,
    )
    return result


@router.post("/validate-timeline")
async def validate_timeline(
    data: ConflictDetectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Validate timeline consistency in the novel."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await plot_conflict_detector.validate_timeline(
        db=db,
        novel_id=data.novel_id,
        language=data.language,
    )
    return result


@router.get("/novel/{novel_id}")
async def get_novel_conflicts(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Quick check for novel conflicts (GET endpoint)."""
    novel = db.query(Novel).filter(
        Novel.id == novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await plot_conflict_detector.detect_plot_conflicts(
        db=db,
        novel_id=novel_id,
    )
    return result
