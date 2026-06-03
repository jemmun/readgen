from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.chapter import Chapter
from app.schemas.chapter import ChapterCreate, ChapterUpdate


def create_chapter(db: Session, chapter: ChapterCreate) -> Chapter:
    word_count = len(chapter.content)
    db_chapter = Chapter(
        **chapter.model_dump(),
        word_count=word_count
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    return db_chapter


def get_chapter(db: Session, chapter_id: int) -> Optional[Chapter]:
    return db.query(Chapter).filter(Chapter.id == chapter_id).first()


def get_chapters_by_novel(db: Session, novel_id: int) -> List[Chapter]:
    return db.query(Chapter).filter(Chapter.novel_id == novel_id).order_by(Chapter.chapter_number).all()


def get_next_chapter_number(db: Session, novel_id: int) -> int:
    last_chapter = db.query(Chapter).filter(Chapter.novel_id == novel_id).order_by(Chapter.chapter_number.desc()).first()
    return (last_chapter.chapter_number + 1) if last_chapter else 1


def update_chapter(db: Session, chapter_id: int, chapter_update: ChapterUpdate) -> Optional[Chapter]:
    db_chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not db_chapter:
        return None
    
    update_data = chapter_update.model_dump(exclude_unset=True)
    if "content" in update_data:
        update_data["word_count"] = len(update_data["content"])
    
    for field, value in update_data.items():
        setattr(db_chapter, field, value)
    
    db.commit()
    db.refresh(db_chapter)
    return db_chapter


def delete_chapter(db: Session, chapter_id: int) -> bool:
    db_chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not db_chapter:
        return False
    db.delete(db_chapter)
    db.commit()
    return True
