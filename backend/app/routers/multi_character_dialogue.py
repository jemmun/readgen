from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.novel import Novel
from app.models.user import User
from app.services.multi_character_dialogue_service import multi_character_dialogue_service
from app.core.security import get_current_user_required

router = APIRouter(prefix="/multi-character-dialogue", tags=["multi-character-dialogue"])


class CharacterInfo(BaseModel):
    name: str
    role: str
    personality: Optional[str] = None


class DialogueSceneRequest(BaseModel):
    novel_id: int
    characters: list
    scene_context: str
    language: Optional[str] = "en"


class DialogueConsistencyRequest(BaseModel):
    dialogue_text: str
    character_profiles: list
    language: Optional[str] = "en"


@router.post("/generate-scene")
async def generate_dialogue_scene(
    data: DialogueSceneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Generate a multi-character dialogue scene."""
    novel = db.query(Novel).filter(
        Novel.id == data.novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await multi_character_dialogue_service.generate_dialogue_scene(
        db=db,
        novel_id=data.novel_id,
        characters=data.characters,
        scene_context=data.scene_context,
        language=data.language,
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result


@router.post("/check-consistency")
async def check_dialogue_consistency(
    data: DialogueConsistencyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Check if dialogue is consistent with character profiles."""
    result = await multi_character_dialogue_service.check_dialogue_consistency(
        db=db,
        dialogue_text=data.dialogue_text,
        character_profiles=data.character_profiles,
        language=data.language,
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result


@router.post("/learn-voice")
async def learn_character_voice(
    novel_id: int,
    character_name: str,
    language: Optional[str] = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Learn character's dialogue patterns from existing chapters."""
    novel = db.query(Novel).filter(
        Novel.id == novel_id,
        Novel.user_id == current_user.id
    ).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")

    result = await multi_character_dialogue_service.learn_character_voice(
        db=db,
        novel_id=novel_id,
        character_name=character_name,
        language=language,
    )
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result
