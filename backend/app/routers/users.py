from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.models.user import User
from app.models.follow import Follow
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.post import Post
from app.models.novel_review import NovelReview
from app.schemas.auth import UserProfile
from app.core.security import get_current_user, get_current_user_required

router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None


@router.get("/{user_id}", response_model=UserProfile)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/posts")
def get_user_posts(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    posts = user.posts
    return [{"id": p.id, "content": p.content, "created_at": p.created_at, "like_count": len(p.likes), "comment_count": len(p.comments)} for p in posts]


@router.get("/{user_id}/followers", response_model=List[UserProfile])
def get_followers(user_id: int, db: Session = Depends(get_db)):
    follows = db.query(Follow).filter(Follow.following_id == user_id).all()
    return [f.follower for f in follows]


@router.get("/{user_id}/following", response_model=List[UserProfile])
def get_following(user_id: int, db: Session = Depends(get_db)):
    follows = db.query(Follow).filter(Follow.follower_id == user_id).all()
    return [f.following for f in follows]


@router.get("/{user_id}/stats")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    follower_count = db.query(func.count(Follow.id)).filter(Follow.following_id == user_id).scalar()
    following_count = db.query(func.count(Follow.id)).filter(Follow.follower_id == user_id).scalar()
    return {
        "follower_count": follower_count,
        "following_count": following_count,
        "post_count": len(user.posts),
        "novel_count": len(user.novels),
    }


@router.get("/{user_id}/novels")
def get_user_novels(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    novels = db.query(Novel).filter(Novel.user_id == user_id, Novel.is_published == True).order_by(Novel.created_at.desc()).all()
    return [{
        "id": n.id,
        "title": n.title,
        "theme_description": n.theme_description,
        "genre": n.genre,
        "style": n.style,
        "tone": n.tone,
        "total_word_count": n.total_word_count,
        "status": n.status,
        "is_published": n.is_published,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    } for n in novels]


@router.get("/search/{query}", response_model=List[UserProfile])
def search_users(query: str, db: Session = Depends(get_db)):
    users = db.query(User).filter(
        (User.username.ilike(f"%{query}%")) | (User.display_name.ilike(f"%{query}%"))
    ).limit(20).all()
    return users


@router.put("/me", response_model=UserProfile)
def update_my_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.bio is not None:
        current_user.bio = data.bio
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}/writing-timeline")
def get_writing_timeline(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    """Get user's writing timeline (novels and chapters created over time)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get novels with creation dates
    novels = db.query(Novel).filter(
        Novel.user_id == user_id,
        Novel.is_published == True
    ).order_by(desc(Novel.created_at)).limit(limit).all()
    
    timeline = []
    for novel in novels:
        chapter_count = db.query(func.count(Chapter.id)).filter(
            Chapter.novel_id == novel.id
        ).scalar()
        
        timeline.append({
            "type": "novel",
            "id": novel.id,
            "title": novel.title,
            "description": novel.theme_description or "",
            "created_at": novel.created_at.isoformat() if novel.created_at else None,
            "chapter_count": chapter_count,
            "word_count": novel.total_word_count,
            "genre": novel.genre,
        })
    
    return timeline


@router.get("/{user_id}/writer-stats")
def get_writer_stats(user_id: int, db: Session = Depends(get_db)):
    """Get detailed writer statistics."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Total word count across all novels
    total_words = db.query(func.sum(Novel.total_word_count)).filter(
        Novel.user_id == user_id
    ).scalar() or 0
    
    # Total chapters
    total_chapters = db.query(func.count(Chapter.id)).join(Novel).filter(
        Novel.user_id == user_id
    ).scalar()
    
    # Total reviews received
    total_reviews = db.query(func.count(NovelReview.id)).join(Novel).filter(
        Novel.user_id == user_id
    ).scalar()
    
    # Average rating
    avg_rating = db.query(func.avg(NovelReview.rating)).join(Novel).filter(
        Novel.user_id == user_id
    ).scalar() or 0
    
    # First novel date (writing start date)
    first_novel = db.query(Novel).filter(
        Novel.user_id == user_id
    ).order_by(Novel.created_at).first()
    
    # Most popular novel (by reviews)
    most_popular = db.query(
        Novel,
        func.count(NovelReview.id).label('review_count')
    ).outerjoin(
        NovelReview, Novel.id == NovelReview.novel_id
    ).filter(
        Novel.user_id == user_id
    ).group_by(Novel.id).order_by(
        desc('review_count')
    ).first()
    
    return {
        "total_words": total_words,
        "total_chapters": total_chapters,
        "total_novels": len(user.novels),
        "total_reviews": total_reviews,
        "avg_rating": round(float(avg_rating), 2),
        "writing_since": first_novel.created_at.isoformat() if first_novel and first_novel.created_at else None,
        "most_popular_novel": {
            "id": most_popular[0].id if most_popular else None,
            "title": most_popular[0].title if most_popular else None,
            "review_count": most_popular[1] if most_popular else 0,
        } if most_popular else None,
    }
