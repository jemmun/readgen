from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.quality_content_service import quality_content_service

router = APIRouter(prefix="/quality-content", tags=["quality-content"])


@router.get("/editors-picks")
def get_editors_picks(
    limit: int = Query(default=20, ge=1, le=50),
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get editor's picks - highest quality novels."""
    results = quality_content_service.get_editors_picks(
        db=db,
        limit=limit,
        genre=genre,
    )
    return {"novels": results}


@router.get("/trending")
def get_trending_now(
    limit: int = Query(default=20, ge=1, le=50),
    days: int = Query(default=7, ge=1, le=30),
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get currently trending novels."""
    results = quality_content_service.get_trending_now(
        db=db,
        limit=limit,
        days=days,
        genre=genre,
    )
    return {"novels": results}


@router.get("/rising-stars")
def get_rising_stars(
    limit: int = Query(default=20, ge=1, le=50),
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db),
):
    """Get rising star novels - new novels gaining traction."""
    results = quality_content_service.get_rising_stars(
        db=db,
        limit=limit,
        days=days,
    )
    return {"novels": results}


@router.get("/score/{novel_id}")
def get_novel_quality_score(
    novel_id: int,
    db: Session = Depends(get_db),
):
    """Get quality score for a specific novel."""
    from app.models.novel import Novel
    
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        return {"error": "Novel not found"}
    
    score = quality_content_service.calculate_quality_score(novel, db)
    return score


@router.get("/by-genre/{genre}")
def get_quality_by_genre(
    genre: str,
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get top quality novels in a specific genre."""
    results = quality_content_service.get_quality_by_genre(
        db=db,
        genre=genre,
        limit=limit,
    )
    return {"novels": results}
