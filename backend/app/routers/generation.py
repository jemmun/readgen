from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.generation_session import GenerationSession
from app.models.novel import Novel
from app.models.user_interaction import UserInteraction
from app.models.user import User
from app.models.chapter import Chapter
from app.schemas.generation import (
    GenerationStartResponse,
    GenerationContinueRequest,
    ChapterGeneratedResponse,
    UserInteractionCreate,
)
from app.services import generation_service, novel_service
from app.core.config import get_settings
from app.core.security import get_current_user_required

settings = get_settings()
router = APIRouter(prefix="/generation", tags=["generation"])


def _format_sse_data(data: str) -> str:
    """Format data for SSE, ensuring each line is prefixed with 'data: '."""
    lines = data.split("\n")
    formatted = "\n".join(f"data: {line}" for line in lines)
    return formatted + "\n\n"


def _authenticate_token(token: str, db: Session) -> User:
    """Authenticate user via query param token for SSE endpoints (EventSource can't send headers)."""
    from jose import jwt as pyjwt
    from app.core.config import get_settings
    user = None
    if token:
        try:
            settings = get_settings()
            payload = pyjwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id_str = payload.get("sub")
            if user_id_str:
                user = db.query(User).filter(User.id == int(user_id_str)).first()
        except Exception:
            pass
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/novels/{novel_id}/generate", response_model=GenerationStartResponse)
async def start_generation(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Generate outline first before creating session
    outline = await generation_service.generate_outline(db_novel)
    
    session = GenerationSession(
        novel_id=novel_id,
        session_type="initial",
        outline=outline,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    db_novel.status = "generating"
    db.commit()
    
    return GenerationStartResponse(
        session_id=session.id,
        novel_id=novel_id,
        status="active",
        message="Generation started. Use the stream endpoint to receive content.",
        outline=outline
    )


@router.get("/novels/{novel_id}/generate/stream")
async def stream_initial_generation(
    novel_id: int,
    token: str = None,
    db: Session = Depends(get_db),
):
    current_user = _authenticate_token(token, db)
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get the active session for this novel
    session = db.query(GenerationSession).filter(
        GenerationSession.novel_id == novel_id,
        GenerationSession.session_type == "initial"
    ).order_by(GenerationSession.id.desc()).first()
    
    outline = session.outline if session else None
    
    async def event_generator():
        try:
            async for chunk in generation_service.generate_initial_chapters_stream(db, db_novel, outline):
                if session and session.status == "cancelled":
                    yield _format_sse_data("[CANCELLED]")
                    db_novel.status = "active"
                    db.commit()
                    return
                yield _format_sse_data(chunk)
            yield _format_sse_data("[DONE]")
            
            db_novel.status = "active"
            db.commit()
        except Exception as e:
            yield _format_sse_data(f"[ERROR] {str(e)}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/{session_id}/continue", response_model=ChapterGeneratedResponse)
async def continue_generation(session_id: int, request: GenerationContinueRequest, db: Session = Depends(get_db)):
    session = db.query(GenerationSession).filter(GenerationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Generation session not found")
    
    db_novel = novel_service.get_novel(db, session.novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    if request.user_direction:
        interaction = UserInteraction(
            session_id=session_id,
            interaction_type="direction",
            content=request.user_direction
        )
        db.add(interaction)
        db.commit()
    
    db_novel.status = "generating"
    db.commit()
    
    try:
        chapter = await generation_service.generate_next_chapter(
            db, db_novel, request.user_direction
        )
        
        db_novel.status = "active"
        db.commit()
        
        return ChapterGeneratedResponse(
            chapter_id=chapter.id,
            chapter_number=chapter.chapter_number,
            title=chapter.title,
            word_count=chapter.word_count,
            content=chapter.content,
            novel_status=db_novel.status,
            total_word_count=db_novel.total_word_count,
        )
    except Exception as e:
        db_novel.status = "active"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("/{session_id}/continue/stream")
async def stream_continue_generation(session_id: int, user_direction: str = None, token: str = None, db: Session = Depends(get_db)):
    # Authenticate via query param token
    _authenticate_token(token, db) if token else None  # Optional auth for continue
    session = db.query(GenerationSession).filter(GenerationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Generation session not found")
    
    db_novel = novel_service.get_novel(db, session.novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    if user_direction:
        interaction = UserInteraction(
            session_id=session_id,
            interaction_type="direction",
            content=user_direction
        )
        db.add(interaction)
        db.commit()
    
    async def event_generator():
        try:
            async for chunk in generation_service.generate_next_chapter_stream(db, db_novel, user_direction):
                if session.status == "cancelled":
                    yield _format_sse_data("[CANCELLED]")
                    db_novel.status = "active"
                    db.commit()
                    return
                yield _format_sse_data(chunk)
            yield _format_sse_data("[DONE]")
            
            db_novel.status = "active"
            db.commit()
        except Exception as e:
            db_novel.status = "active"
            db.commit()
            yield _format_sse_data(f"[ERROR] {str(e)}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/{session_id}/interact")
async def add_interaction(session_id: int, interaction: UserInteractionCreate, db: Session = Depends(get_db)):
    session = db.query(GenerationSession).filter(GenerationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Generation session not found")
    
    db_interaction = UserInteraction(
        session_id=session_id,
        interaction_type=interaction.interaction_type,
        content=interaction.content
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    
    return {"message": "Interaction recorded", "interaction_id": db_interaction.id}


@router.post("/{session_id}/cancel")
async def cancel_generation(session_id: int, db: Session = Depends(get_db)):
    session = db.query(GenerationSession).filter(GenerationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Generation session not found")
    
    session.status = "cancelled"
    db.commit()
    db.refresh(session)
    
    return {"message": "Generation cancelled", "session_id": session.id}


@router.get("/{session_id}")
async def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(GenerationSession).filter(GenerationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Generation session not found")
    return session


@router.get("/novels/{novel_id}/outline")
async def get_novel_outline(novel_id: int, db: Session = Depends(get_db)):
    session = db.query(GenerationSession).filter(
        GenerationSession.novel_id == novel_id,
        GenerationSession.session_type == "initial"
    ).order_by(GenerationSession.id.desc()).first()
    
    if not session or not session.outline:
        raise HTTPException(status_code=404, detail="Outline not found for this novel")
    
    return {"outline": session.outline}


@router.put("/{session_id}/outline")
async def update_session_outline(session_id: int, outline: str = Body(...), db: Session = Depends(get_db)):
    session = db.query(GenerationSession).filter(GenerationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Generation session not found")
    
    session.outline = outline
    db.commit()
    db.refresh(session)
    
    return {"message": "Outline updated", "session_id": session.id}


@router.put("/novels/{novel_id}/outline")
async def update_novel_outline(
    novel_id: int,
    outline: str = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Update the outline for a novel's latest initial generation session."""
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can edit the outline")

    session = db.query(GenerationSession).filter(
        GenerationSession.novel_id == novel_id,
        GenerationSession.session_type == "initial"
    ).order_by(GenerationSession.id.desc()).first()

    if not session:
        raise HTTPException(status_code=404, detail="No generation session found for this novel")

    session.outline = outline
    db.commit()
    db.refresh(session)

    return {"message": "Outline updated", "outline": session.outline}


@router.post("/novels/{novel_id}/regenerate-outline")
async def regenerate_novel_outline(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Regenerate the outline for a novel using AI."""
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can regenerate the outline")

    # Generate a new outline
    new_outline = await generation_service.generate_outline(db_novel)

    # Update existing session or create a new one
    session = db.query(GenerationSession).filter(
        GenerationSession.novel_id == novel_id,
        GenerationSession.session_type == "initial"
    ).order_by(GenerationSession.id.desc()).first()

    if session:
        session.outline = new_outline
    else:
        session = GenerationSession(
            novel_id=novel_id,
            session_type="initial",
            outline=new_outline,
            status="active"
        )
        db.add(session)

    db.commit()
    db.refresh(session)

    return {"outline": new_outline, "session_id": session.id}


@router.get("/novels/{novel_id}/outline/chapters")
async def get_outline_chapters(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Parse the novel's outline into a list of structured chapter plans."""
    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the author can access outline chapters")

    session = db.query(GenerationSession).filter(
        GenerationSession.novel_id == novel_id,
        GenerationSession.session_type == "initial"
    ).order_by(GenerationSession.id.desc()).first()

    if not session or not session.outline:
        raise HTTPException(status_code=404, detail="Outline not found for this novel")

    chapters = generation_service.parse_outline_chapters(session.outline)
    return {"chapters": chapters, "total": len(chapters)}


@router.get("/novels/{novel_id}/generate/chapter/{chapter_index}/stream")
async def stream_single_chapter(
    novel_id: int,
    chapter_index: int,
    token: str = None,
    db: Session = Depends(get_db),
):
    """Stream-generate a single chapter by index from the outline."""
    user = _authenticate_token(token, db)

    db_novel = novel_service.get_novel(db, novel_id)
    if not db_novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    if db_novel.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    session = db.query(GenerationSession).filter(
        GenerationSession.novel_id == novel_id,
        GenerationSession.session_type == "initial"
    ).order_by(GenerationSession.id.desc()).first()

    if not session or not session.outline:
        raise HTTPException(status_code=404, detail="Outline not found")

    chapter_plans = generation_service.parse_outline_chapters(session.outline)
    if chapter_index < 0 or chapter_index >= len(chapter_plans):
        raise HTTPException(status_code=400, detail=f"Chapter index {chapter_index} out of range (0-{len(chapter_plans)-1})")

    chapter_plan = chapter_plans[chapter_index]

    # Build summary of previously generated chapters for continuity
    existing_chapters = db.query(Chapter).filter(
        Chapter.novel_id == novel_id
    ).order_by(Chapter.chapter_number).all()
    prev_summary = generation_service.summarize_chapters(existing_chapters) if existing_chapters else ""

    db_novel.status = "generating"
    db.commit()

    async def event_generator():
        try:
            async for chunk in generation_service.generate_single_chapter_stream(
                db, db_novel, chapter_plan, prev_summary
            ):
                if session and session.status == "cancelled":
                    yield _format_sse_data("[CANCELLED]")
                    db_novel.status = "active"
                    db.commit()
                    return
                yield _format_sse_data(chunk)
            yield _format_sse_data("[DONE]")
            db_novel.status = "active"
            db.commit()
        except Exception as e:
            db_novel.status = "active"
            db.commit()
            yield _format_sse_data(f"[ERROR] {str(e)}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
