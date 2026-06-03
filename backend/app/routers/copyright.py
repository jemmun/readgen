from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.novel import Novel
from app.models.user import User
from app.services.copyright_service import copyright_protection_service
from app.core.security import get_current_user_required

router = APIRouter(prefix="/copyright", tags=["copyright"])


class CopyrightRegistrationRequest(BaseModel):
    novel_id: int


class ContentVerificationRequest(BaseModel):
    novel_id: int
    content: str


@router.post("/register")
def register_copyright(
    data: CopyrightRegistrationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Register copyright for a novel."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found or not owned by you")

    result = copyright_protection_service.register_copyright(
        db=db,
        novel_id=data.novel_id,
        user_id=current_user.id,
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/verify")
def verify_content_ownership(
    data: ContentVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Verify if content matches a registered novel."""
    novel = db.query(Novel).filter(Novel.id == data.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = copyright_protection_service.verify_content_ownership(
        db=db,
        novel_id=data.novel_id,
        content_to_check=data.content,
    )
    return result


@router.get("/info/{novel_id}")
def get_copyright_info(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get copyright information for a novel."""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = copyright_protection_service.get_copyright_info(
        db=db,
        novel_id=novel_id,
    )
    return result


@router.post("/add-notice/{novel_id}")
def add_copyright_notice(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Add copyright notice to novel content."""
    novel = db.query(Novel).filter(
        Novel.id == novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found or not owned by you")

    # Add notice to all chapters
    updated_chapters = []
    for chapter in novel.chapters:
        if chapter.content and "All rights reserved" not in chapter.content:
            chapter.content = copyright_protection_service.add_copyright_notice(
                chapter.content,
                current_user.username
            )
            updated_chapters.append(chapter.chapter_number)
    
    db.commit()
    
    return {
        "message": "Copyright notice added",
        "updated_chapters": updated_chapters,
        "total_updated": len(updated_chapters),
    }
