from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.novel import Novel
from app.models.novel_review import NovelReview
from app.models.user import User
from app.schemas.novel import NovelCreate, NovelInDB, NovelUpdate, NovelDetail
from app.services import novel_service
from app.services.recommendation_service import recommendation_service
from app.core.security import get_current_user, get_current_user_required

router = APIRouter(prefix="/novels", tags=["novels"])


# Enrich novel with author info for public-facing responses
def _enrich_novel(novel: Novel) -> dict:
    return {
        "id": novel.id,
        "user_id": novel.user_id,
        "title": novel.title,
        "theme_description": novel.theme_description,
        "genre": novel.genre,
        "style": novel.style,
        "target_audience": novel.target_audience,
        "protagonist_info": novel.protagonist_info,
        "setting": novel.setting,
        "tone": novel.tone,
        "language": novel.language,
        "max_chapters": novel.max_chapters,
        "total_word_count": novel.total_word_count,
        "status": novel.status,
        "is_published": novel.is_published,
        "cover_image_url": novel.cover_image_url,
        "created_at": novel.created_at.isoformat() if novel.created_at else None,
        "updated_at": novel.updated_at.isoformat() if novel.updated_at else None,
        "author": {
            "id": novel.author.id,
            "username": novel.author.username,
            "display_name": novel.author.display_name,
        } if novel.author else None,
    }


@router.post("", response_model=NovelInDB)
def create_novel(
    novel: NovelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db_novel = novel_service.create_novel(db, novel, user_id=current_user.id)
    return db_novel


@router.get("", response_model=List[dict])
def list_novels(
    skip: int = 0,
    limit: int = 100,
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    if genre:
        novels = novel_service.get_novels_by_genre(db, genre=genre, skip=skip, limit=limit)
    elif current_user:
        novels = novel_service.get_novels_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    else:
        novels = novel_service.get_novels(db, skip=skip, limit=limit)
    return [_enrich_novel(n) for n in novels]


@router.get("/search", response_model=List[dict])
def search_novels(
    q: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    novels = novel_service.search_novels(db, query=q, skip=skip, limit=limit)
    # Filter to published only for public search
    novels = [n for n in novels if n.is_published]
    return [_enrich_novel(n) for n in novels]


@router.get("/recommended", response_model=List[dict])
def recommended_novels(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    novels = novel_service.get_recommended_novels(db, user_id=current_user.id if current_user else None, limit=limit)
    return [_enrich_novel(n) for n in novels]


@router.get("/genres")
def list_genres(db: Session = Depends(get_db)):
    genres = novel_service.get_distinct_genres(db)
    return {"genres": genres}


@router.get("/tags/popular")
def get_popular_tags(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get popular tags across all dimensions (genre, style, tone, target_audience)."""
    from sqlalchemy import func
    
    # Get distinct values with counts for each tag dimension
    genres = db.query(Novel.genre, func.count(Novel.id)).filter(
        Novel.is_published == True, Novel.genre.isnot(None)
    ).group_by(Novel.genre).order_by(func.count(Novel.id).desc()).limit(limit).all()
    
    styles = db.query(Novel.style, func.count(Novel.id)).filter(
        Novel.is_published == True, Novel.style.isnot(None)
    ).group_by(Novel.style).order_by(func.count(Novel.id).desc()).limit(limit).all()
    
    tones = db.query(Novel.tone, func.count(Novel.id)).filter(
        Novel.is_published == True, Novel.tone.isnot(None)
    ).group_by(Novel.tone).order_by(func.count(Novel.id).desc()).limit(limit).all()
    
    audiences = db.query(Novel.target_audience, func.count(Novel.id)).filter(
        Novel.is_published == True, Novel.target_audience.isnot(None)
    ).group_by(Novel.target_audience).order_by(func.count(Novel.id).desc()).limit(limit).all()
    
    return {
        "genres": [{"name": g[0], "count": g[1]} for g in genres],
        "styles": [{"name": s[0], "count": s[1]} for s in styles],
        "tones": [{"name": t[0], "count": t[1]} for t in tones],
        "target_audiences": [{"name": a[0], "count": a[1]} for a in audiences],
    }


@router.get("/new-releases", response_model=List[dict])
def get_new_releases(
    limit: int = Query(default=20, ge=1, le=100),
    days: int = Query(default=30, ge=1, le=90),
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get newly published novels within the specified days."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(Novel).filter(
        Novel.is_published == True,
        Novel.created_at >= cutoff_date
    )
    
    if genre:
        query = query.filter(Novel.genre == genre)
    
    novels = query.order_by(desc(Novel.created_at)).limit(limit).all()
    return [_enrich_novel(n) for n in novels]


@router.get("/editor-picks", response_model=List[dict])
def get_editor_picks(
    limit: int = Query(default=10, ge=1, le=50),
    genre: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get editor-picked novels based on quality metrics (high rating + good engagement)."""
    from sqlalchemy import func
    
    query = (
        db.query(
            Novel,
            func.avg(NovelReview.rating).label('avg_rating'),
            func.count(NovelReview.id).label('review_count')
        )
        .outerjoin(NovelReview)
        .filter(Novel.is_published == True)
        .group_by(Novel.id)
        .having(func.count(NovelReview.id) >= 2)  # At least 2 reviews
    )
    
    if genre:
        query = query.filter(Novel.genre == genre)
    
    # Order by rating * log(review_count + 1) for balanced scoring
    novels_with_stats = query.order_by(
        desc(func.avg(NovelReview.rating) * func.log(func.count(NovelReview.id) + 1))
    ).limit(limit).all()
    
    return [_enrich_novel(n) for n, _, _ in novels_with_stats]


@router.get("/trending-new", response_model=List[dict])
def get_trending_new_books(
    limit: int = Query(default=15, ge=1, le=50),
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Get new books that are trending (recent + high engagement)."""
    from sqlalchemy import func
    from app.models.user_interaction import Bookmark, Like
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    query = (
        db.query(
            Novel,
            func.count(func.distinct(Bookmark.id)).label('bookmark_count'),
            func.count(func.distinct(Like.id)).label('like_count')
        )
        .outerjoin(Bookmark, Bookmark.novel_id == Novel.id)
        .outerjoin(Like, Like.novel_id == Novel.id)
        .filter(
            Novel.is_published == True,
            Novel.created_at >= cutoff_date
        )
        .group_by(Novel.id)
    )
    
    novels_with_stats = query.order_by(
        desc(func.count(func.distinct(Bookmark.id)) + func.count(func.distinct(Like.id)))
    ).limit(limit).all()
    
    return [_enrich_novel(n) for n, _, _ in novels_with_stats]


@router.get("/all", response_model=dict)
def list_all_novels(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    genre: Optional[str] = None,
    style: Optional[str] = None,
    tone: Optional[str] = None,
    target_audience: Optional[str] = None,
    status: Optional[str] = None,
    is_completed: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """List all published novels with advanced filtering and pagination."""
    query = db.query(Novel).filter(Novel.is_published == True)
    
    if genre:
        query = query.filter(Novel.genre == genre)
    if style:
        query = query.filter(Novel.style == style)
    if tone:
        query = query.filter(Novel.tone == tone)
    if target_audience:
        query = query.filter(Novel.target_audience == target_audience)
    if status:
        query = query.filter(Novel.status == status)
    if is_completed is not None:
        if is_completed:
            query = query.filter(Novel.status == 'completed')
        else:
            query = query.filter(Novel.status != 'completed')
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    skip = (page - 1) * page_size
    novels = query.order_by(desc(Novel.created_at)).offset(skip).limit(page_size).all()
    
    return {
        "items": [_enrich_novel(n) for n in novels],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
        "has_next": page * page_size < total,
        "has_prev": page > 1,
    }


@router.post("/{novel_id}/publish")
def toggle_publish(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can publish/unpublish")
    new_state = not db_novel.is_published
    novel_service.publish_novel(db, novel_id, is_published=new_state)
    return {"message": f"Novel {'published' if new_state else 'unpublished'}", "novel_id": novel_id, "is_published": new_state}


@router.get("/recommendations", response_model=List[dict])
def get_recommendations(
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Get personalized novel recommendations for the current user.
    If not authenticated, returns popular novels."""
    if current_user:
        novels = recommendation_service.get_recommendations_for_user(
            db=db,
            user_id=current_user.id,
            limit=limit,
        )
    else:
        # For anonymous users, return popular novels
        novels = recommendation_service.get_popular_novels(db, limit)
    return [_enrich_novel(n) for n in novels]


@router.get("/{novel_id}", response_model=NovelDetail)
def get_novel(novel_id: int, db: Session = Depends(get_db)):
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    return db_novel


@router.put("/{novel_id}", response_model=NovelInDB)
def update_novel(
    novel_id: int,
    novel_update: NovelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_novel = novel_service.update_novel(db, novel_id, novel_update)
    return db_novel


@router.delete("/{novel_id}")
def delete_novel(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    success = novel_service.delete_novel(db, novel_id)
    return {"message": "Novel deleted successfully"}


@router.get("/{novel_id}/export-txt", response_class=PlainTextResponse)
def export_novel_txt(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    from app.models.chapter import Chapter
    chapters = db.query(Chapter).filter(Chapter.novel_id == novel_id).order_by(Chapter.chapter_number).all()
    lines = [db_novel.title, "=" * len(db_novel.title), ""]
    if db_novel.theme_description:
        lines += [db_novel.theme_description, ""]
    for ch in chapters:
        lines += [f"Chapter {ch.chapter_number}: {ch.title}", "-" * 40, ch.content or "", ""]
    return PlainTextResponse("\n".join(lines), media_type="text/plain; charset=utf-8")


@router.post("/{novel_id}/share")
def share_novel(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Generate a shareable link for a published novel."""
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    share_url = f"http://localhost:3000/novel/{novel_id}"
    return {"share_url": share_url, "novel_id": novel_id, "title": db_novel.title}


@router.get("/rankings")
def get_novel_rankings(
    period: str = Query(default="weekly", regex="^(daily|weekly|monthly)$"),
    genre: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get novel rankings based on reviews and ratings."""
    # Calculate time range
    now = datetime.utcnow()
    if period == "daily":
        start_date = now - timedelta(days=1)
    elif period == "weekly":
        start_date = now - timedelta(weeks=1)
    else:  # monthly
        start_date = now - timedelta(days=30)
    
    # Query novels with review stats
    query = (
        db.query(
            Novel,
            func.count(NovelReview.id).label('review_count'),
            func.coalesce(func.avg(NovelReview.rating), 0).label('avg_rating')
        )
        .outerjoin(NovelReview, Novel.id == NovelReview.novel_id)
        .filter(Novel.is_published == True)
        .filter(Novel.created_at >= start_date)
    )
    
    if genre:
        query = query.filter(Novel.genre == genre)
    
    query = (
        query
        .group_by(Novel.id)
        .order_by(
            desc('avg_rating'),
            desc('review_count'),
            desc(Novel.total_word_count)
        )
        .limit(limit)
    )
    
    results = query.all()
    
    rankings = []
    for novel, review_count, avg_rating in results:
        novel_data = _enrich_novel(novel)
        novel_data['review_count'] = review_count
        novel_data['avg_rating'] = round(float(avg_rating), 2)
        rankings.append(novel_data)
    
    return {
        "period": period,
        "genre": genre,
        "novels": rankings,
        "total": len(rankings)
    }


@router.get("/{novel_id}/similar", response_model=List[dict])
def get_similar_novels(
    novel_id: int,
    limit: int = Query(default=10, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Get novels similar to a specific novel."""
    novels = recommendation_service.get_similar_novels(
        db=db,
        novel_id=novel_id,
        limit=limit,
    )
    return [_enrich_novel(n) for n in novels]


@router.get("/trending/{genre}", response_model=List[dict])
def get_trending_in_genre(
    genre: str,
    limit: int = Query(default=10, ge=1, le=20),
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Get trending novels in a specific genre."""
    novels = recommendation_service.get_trending_in_genre(
        db=db,
        genre=genre,
        limit=limit,
        days=days,
    )
    return [_enrich_novel(n) for n in novels]
