from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.enhanced_search_service import enhanced_search_service

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str
    genre: Optional[str] = None
    style: Optional[str] = None
    tone: Optional[str] = None
    target_audience: Optional[str] = None
    status: Optional[str] = None
    is_completed: Optional[bool] = None
    min_word_count: Optional[int] = None
    max_word_count: Optional[int] = None


@router.post("/novels")
async def advanced_search(
    data: SearchRequest,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Advanced novel search with multiple filters."""
    filters = {
        "genre": data.genre,
        "style": data.style,
        "tone": data.tone,
        "target_audience": data.target_audience,
        "status": data.status,
        "is_completed": data.is_completed,
        "min_word_count": data.min_word_count,
        "max_word_count": data.max_word_count,
    }
    
    result = await enhanced_search_service.search_novels(
        db=db,
        query=data.query,
        filters=filters,
        page=page,
        page_size=page_size,
    )
    return result


@router.get("/novels")
async def search_novels_get(
    q: str,
    genre: Optional[str] = None,
    style: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Simple GET search endpoint."""
    filters = {
        "genre": genre,
        "style": style,
    }
    
    result = await enhanced_search_service.search_novels(
        db=db,
        query=q,
        filters=filters,
        page=page,
        page_size=page_size,
    )
    return result


@router.get("/suggestions")
async def get_suggestions(
    q: str,
    limit: int = Query(default=10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Get autocomplete search suggestions."""
    result = await enhanced_search_service.get_search_suggestions(
        db=db,
        partial_query=q,
        limit=limit,
    )
    return result


@router.get("/stats")
async def get_search_stats(
    db: Session = Depends(get_db),
):
    """Get search filter statistics (genres, styles, etc.)."""
    result = await enhanced_search_service.get_search_stats(db=db)
    return result
