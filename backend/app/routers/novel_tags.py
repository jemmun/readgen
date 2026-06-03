from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.novel_tag import NovelTag
from app.models.novel import Novel
from app.models.user import User
from app.core.security import get_current_user_required
from pydantic import BaseModel

router = APIRouter(prefix="/novel-tags", tags=["novel-tags"])


class TagCreate(BaseModel):
    novel_id: int
    tag: str


class TagInDB(BaseModel):
    id: int
    novel_id: int
    tag: str

    class Config:
        from_attributes = True


@router.post("", response_model=TagInDB)
def add_tag(
    data: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Add a tag to a novel."""
    # Check if novel exists
    novel = db.query(Novel).filter(Novel.id == data.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    # Check if tag already exists
    existing = db.query(NovelTag).filter(
        NovelTag.novel_id == data.novel_id,
        NovelTag.tag == data.tag
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists on this novel")
    
    tag = NovelTag(
        novel_id=data.novel_id,
        tag=data.tag.lower().strip(),
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def remove_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Remove a tag from a novel."""
    tag = db.query(NovelTag).filter(NovelTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    return {"message": "Tag removed"}


@router.get("/novel/{novel_id}", response_model=List[TagInDB])
def get_novel_tags(
    novel_id: int,
    db: Session = Depends(get_db),
):
    """Get all tags for a novel."""
    return db.query(NovelTag).filter(
        NovelTag.novel_id == novel_id
    ).all()


@router.get("/popular", response_model=List[str])
def get_popular_tags(
    db: Session = Depends(get_db),
):
    """Get most popular tags across all novels."""
    from sqlalchemy import func
    
    result = db.query(
        NovelTag.tag,
        func.count(NovelTag.id).label('count')
    ).group_by(NovelTag.tag).order_by(func.count(NovelTag.id).desc()).limit(50).all()
    
    return [tag for tag, count in result]
