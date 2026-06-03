from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.user import User
from app.services.writing_assistant_service import writing_assistant_service
from app.core.security import get_current_user_required

router = APIRouter(prefix="/writing-assistant", tags=["writing-assistant"])


class ContinuationRequest(BaseModel):
    novel_id: int
    chapter_id: int
    current_text: str
    language: Optional[str] = "en"


class PlotDevelopmentRequest(BaseModel):
    novel_id: int
    current_chapter_num: int
    language: Optional[str] = "en"


class WritingImprovementRequest(BaseModel):
    text: str
    language: Optional[str] = "en"


class ScenePromptRequest(BaseModel):
    novel_id: int
    scene_type: Optional[str] = "any"
    language: Optional[str] = "en"


@router.post("/continuation")
async def get_continuation_suggestions(
    data: ContinuationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get AI suggestions for continuing the current text."""
    # Verify user owns the novel
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await writing_assistant_service.get_continuation_suggestions(
        db=db,
        novel_id=data.novel_id,
        chapter_id=data.chapter_id,
        current_text=data.current_text,
        language=data.language,
    )
    return result


@router.post("/plot-development")
async def get_plot_development_ideas(
    data: PlotDevelopmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get plot development ideas for the novel."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await writing_assistant_service.get_plot_development_ideas(
        db=db,
        novel_id=data.novel_id,
        current_chapter_num=data.current_chapter_num,
        language=data.language,
    )
    return result


@router.post("/improve-writing")
async def get_writing_improvement_suggestions(
    data: WritingImprovementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get suggestions to improve writing quality."""
    result = await writing_assistant_service.get_writing_improvement_suggestions(
        db=db,
        text=data.text,
        language=data.language,
    )
    return result


@router.post("/scene-prompts")
async def generate_scene_prompts(
    data: ScenePromptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Generate creative scene prompts to inspire writing."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await writing_assistant_service.generate_scene_prompts(
        db=db,
        novel_id=data.novel_id,
        scene_type=data.scene_type,
        language=data.language,
    )
    return result


@router.get("/scene-prompts/{novel_id}")
async def get_scene_prompts_for_novel(
    novel_id: int,
    scene_type: Optional[str] = Query(default="any"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get scene prompts for a specific novel (GET endpoint)."""
    novel = db.query(Novel).filter(
        Novel.id == novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await writing_assistant_service.generate_scene_prompts(
        db=db,
        novel_id=novel_id,
        scene_type=scene_type,
    )
    return result
