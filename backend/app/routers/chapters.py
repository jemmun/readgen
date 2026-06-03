from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.chapter import ChapterInDB, ChapterUpdate
from app.services import chapter_service

router = APIRouter(prefix="/novels", tags=["chapters"])


@router.get("/{novel_id}/chapters", response_model=List[ChapterInDB])
def list_chapters(novel_id: int, db: Session = Depends(get_db)):
    return chapter_service.get_chapters_by_novel(db, novel_id)


@router.get("/chapters/{chapter_id}", response_model=ChapterInDB)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    db_chapter = chapter_service.get_chapter(db, chapter_id)
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db_chapter


@router.put("/chapters/{chapter_id}", response_model=ChapterInDB)
def update_chapter(chapter_id: int, chapter_update: ChapterUpdate, db: Session = Depends(get_db)):
    db_chapter = chapter_service.update_chapter(db, chapter_id, chapter_update)
    if not db_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db_chapter
