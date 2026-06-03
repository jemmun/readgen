from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.novel import Novel
from app.schemas.novel import NovelCreate, NovelUpdate


def create_novel(db: Session, novel: NovelCreate, user_id: int) -> Novel:
    data = novel.model_dump()
    data["user_id"] = user_id
    db_novel = Novel(**data)
    db.add(db_novel)
    db.commit()
    db.refresh(db_novel)
    return db_novel


def get_novel(db: Session, novel_id: int) -> Optional[Novel]:
    return db.query(Novel).filter(Novel.id == novel_id).first()


def get_novels(db: Session, skip: int = 0, limit: int = 100, published_only: bool = False) -> List[Novel]:
    q = db.query(Novel)
    if published_only:
        q = q.filter(Novel.is_published == True)
    return q.order_by(Novel.created_at.desc()).offset(skip).limit(limit).all()


def get_novels_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Novel]:
    return db.query(Novel).filter(Novel.user_id == user_id).order_by(Novel.created_at.desc()).offset(skip).limit(limit).all()


def update_novel(db: Session, novel_id: int, novel_update: NovelUpdate) -> Optional[Novel]:
    db_novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not db_novel:
        return None
    
    update_data = novel_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_novel, field, value)
    
    db.commit()
    db.refresh(db_novel)
    return db_novel


def delete_novel(db: Session, novel_id: int) -> bool:
    db_novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not db_novel:
        return False
    db.delete(db_novel)
    db.commit()
    return True


def search_novels(db: Session, query: str, skip: int = 0, limit: int = 50) -> List[Novel]:
    q = f"%{query}%"
    return (
        db.query(Novel)
        .filter(
            or_(
                Novel.title.ilike(q),
                Novel.theme_description.ilike(q),
                Novel.genre.ilike(q),
            )
        )
        .order_by(Novel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_recommended_novels(db: Session, user_id: Optional[int] = None, limit: int = 20) -> List[Novel]:
    """Interest-based + social recommendation."""
    q = db.query(Novel).filter(Novel.is_published == True)
    if user_id is not None:
        q = q.filter(Novel.user_id != user_id)
        # Try interest-based: user's own genres first
        from app.models.user import User
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # Get genres from user's own novels
            user_genres = [n.genre for n in db.query(Novel).filter(Novel.user_id == user_id, Novel.genre.isnot(None)).all()]
            if user_genres:
                genre_set = list(set(user_genres))
                # Prefer novels matching user's genres
                preferred = q.filter(Novel.genre.in_(genre_set)).order_by(Novel.created_at.desc()).limit(limit).all()
                if len(preferred) >= limit:
                    return preferred
                # Fill remaining with other novels
                preferred_ids = [n.id for n in preferred]
                remaining = db.query(Novel).filter(
                    Novel.is_published == True,
                    Novel.user_id != user_id,
                    ~Novel.id.in_(preferred_ids),
                ).order_by(Novel.created_at.desc()).limit(limit - len(preferred)).all()
                return preferred + remaining
    return q.order_by(Novel.created_at.desc()).limit(limit).all()


def get_distinct_genres(db: Session) -> List[str]:
    rows = db.query(Novel.genre).filter(Novel.genre.isnot(None)).distinct().all()
    return sorted([r[0] for r in rows if r[0]])


def get_novels_by_genre(db: Session, genre: str, skip: int = 0, limit: int = 50, published_only: bool = False) -> List[Novel]:
    q = db.query(Novel).filter(Novel.genre.ilike(genre))
    if published_only:
        q = q.filter(Novel.is_published == True)
    return q.order_by(Novel.created_at.desc()).offset(skip).limit(limit).all()


def publish_novel(db: Session, novel_id: int, is_published: bool = True) -> Optional[Novel]:
    db_novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if db_novel:
        db_novel.is_published = is_published
        db.commit()
        db.refresh(db_novel)
    return db_novel


def update_novel_word_count(db: Session, novel_id: int) -> Novel:
    db_novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if db_novel:
        total = sum(ch.word_count for ch in db_novel.chapters)
        db_novel.total_word_count = total
        db.commit()
        db.refresh(db_novel)
    return db_novel
