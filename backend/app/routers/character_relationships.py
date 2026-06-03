from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.novel import Novel
from app.models.user import User
from app.services.character_relationship_service import character_relationship_analyzer
from app.core.security import get_current_user_required

router = APIRouter(prefix="/character-relationships", tags=["character-relationships"])


class RelationshipAnalysisRequest(BaseModel):
    novel_id: int
    language: Optional[str] = "en"


class CharacterPairRequest(BaseModel):
    novel_id: int
    character1: str
    character2: str
    language: Optional[str] = "en"


class CharacterNetworkRequest(BaseModel):
    novel_id: int
    focus_character: str
    language: Optional[str] = "en"


@router.post("/analyze")
async def analyze_relationships(
    data: RelationshipAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Analyze all character relationships in the novel."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await character_relationship_analyzer.analyze_relationships(
        db=db,
        novel_id=data.novel_id,
        language=data.language,
    )
    return result


@router.post("/evolution")
async def track_relationship_evolution(
    data: CharacterPairRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Track how a relationship between two characters evolves."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await character_relationship_analyzer.track_relationship_evolution(
        db=db,
        novel_id=data.novel_id,
        character1=data.character1,
        character2=data.character2,
        language=data.language,
    )
    return result


@router.post("/network")
async def get_character_network(
    data: CharacterNetworkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get relationship network for a specific character."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await character_relationship_analyzer.get_character_network(
        db=db,
        novel_id=data.novel_id,
        focus_character=data.focus_character,
        language=data.language,
    )
    return result


@router.get("/novel/{novel_id}")
async def get_novel_relationships(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Quick relationship analysis (GET endpoint)."""
    novel = db.query(Novel).filter(
        Novel.id == novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await character_relationship_analyzer.analyze_relationships(
        db=db,
        novel_id=novel_id,
    )
    return result
