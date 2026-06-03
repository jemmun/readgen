from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.user import User
from app.core.security import get_current_user_required
from app.services.export_service import build_epub, build_pdf

router = APIRouter(prefix="/novels", tags=["exports"])


def _get_novel_with_chapters(db: Session, novel_id: int, user: User):
    novel = (
        db.query(Novel)
        .options(joinedload(Novel.author))
        .filter(Novel.id == novel_id)
        .first()
    )
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if novel.user_id != user.id:
        raise HTTPException(status_code=403, detail="Only the author can export this novel")

    chapters = (
        db.query(Chapter)
        .filter(Chapter.novel_id == novel_id)
        .order_by(Chapter.chapter_number)
        .all()
    )
    if not chapters:
        raise HTTPException(status_code=400, detail="No chapters to export. Generate at least one chapter first.")

    return novel, chapters


@router.get("/{novel_id}/export/epub")
def export_epub(
    novel_id: int,
    include_metadata: bool = Query(default=True),
    chapter_from: int = Query(default=None, ge=1),
    chapter_to: int = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    novel, chapters = _get_novel_with_chapters(db, novel_id, current_user)
    
    # Filter chapters if range specified
    if chapter_from is not None or chapter_to is not None:
        filtered = []
        for ch in chapters:
            if chapter_from and ch.chapter_number < chapter_from:
                continue
            if chapter_to and ch.chapter_number > chapter_to:
                continue
            filtered.append(ch)
        chapters = filtered
        if not chapters:
            raise HTTPException(status_code=400, detail="No chapters in specified range")
    
    epub_bytes = build_epub(novel, chapters, include_metadata=include_metadata)
    safe_title = novel.title.replace(' ', '_')[:50]
    return Response(
        content=epub_bytes,
        media_type="application/epub+zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.epub"'},
    )


@router.get("/{novel_id}/export/pdf")
def export_pdf(
    novel_id: int,
    include_metadata: bool = Query(default=True),
    chapter_from: int = Query(default=None, ge=1),
    chapter_to: int = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    novel, chapters = _get_novel_with_chapters(db, novel_id, current_user)
    
    # Filter chapters if range specified
    if chapter_from is not None or chapter_to is not None:
        filtered = []
        for ch in chapters:
            if chapter_from and ch.chapter_number < chapter_from:
                continue
            if chapter_to and ch.chapter_number > chapter_to:
                continue
            filtered.append(ch)
        chapters = filtered
        if not chapters:
            raise HTTPException(status_code=400, detail="No chapters in specified range")
    
    pdf_bytes = build_pdf(novel, chapters, include_metadata=include_metadata)
    safe_title = novel.title.replace(' ', '_')[:50]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )
