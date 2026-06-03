from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.illustration import Illustration
from app.models.user import User
from app.schemas.illustration import IllustrationCreate, IllustrationInDB, IllustrationUpdate
from app.core.security import get_current_user_required
from app.services import illustration_service

router = APIRouter(prefix="/illustrations", tags=["illustrations"])


@router.post("", response_model=IllustrationInDB)
async def create_illustration(
    data: IllustrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    try:
        illustration = await illustration_service.generate_illustration(
            db=db,
            user_id=current_user.id,
            prompt=data.prompt,
            style=data.style,
            size=data.size,
        )
        # Auto-set novel cover if illustration_type is cover and novel_id provided
        if data.illustration_type == 'cover' and illustration.image_url:
            from app.models.novel import Novel
            from app.models.chapter import Chapter
            
            # If chapter_id is provided, get the novel from chapter
            if data.chapter_id:
                chapter = db.query(Chapter).filter(Chapter.id == data.chapter_id).first()
                if chapter:
                    illustration.novel_id = chapter.novel_id
                    illustration.chapter_id = data.chapter_id
            
            # If novel_id is provided directly
            if data.novel_id:
                illustration.novel_id = data.novel_id
            
            # Set as novel cover (each novel only has ONE cover)
            if illustration.novel_id:
                novel = db.query(Novel).filter(Novel.id == illustration.novel_id).first()
                if novel:
                    # Update the novel's cover_image_url (replaces any existing cover)
                    novel.cover_image_url = illustration.image_url
                    db.commit()
                    db.refresh(illustration)
        
        return illustration
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        if "access denied" in error_msg.lower():
            raise HTTPException(status_code=503, detail=f"Image generation model not available. Please enable an image generation model (e.g., Wanx) in your AI provider dashboard. Error: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to generate illustration: {error_msg}")


@router.get("", response_model=List[IllustrationInDB])
def get_my_illustrations(
    novel_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    illustration_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    q = db.query(Illustration).filter(Illustration.user_id == current_user.id)
    if novel_id is not None:
        q = q.filter(Illustration.novel_id == novel_id)
    if chapter_id is not None:
        q = q.filter(Illustration.chapter_id == chapter_id)
    if illustration_type:
        q = q.filter(Illustration.illustration_type == illustration_type)
    return q.order_by(Illustration.created_at.desc()).all()


@router.get("/{illustration_id}", response_model=IllustrationInDB)
def get_illustration(
    illustration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    illustration = db.query(Illustration).filter(
        Illustration.id == illustration_id,
        Illustration.user_id == current_user.id
    ).first()
    if not illustration:
        raise HTTPException(status_code=404, detail="Illustration not found")
    return illustration


@router.delete("/{illustration_id}")
def delete_illustration(
    illustration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    illustration = db.query(Illustration).filter(
        Illustration.id == illustration_id,
        Illustration.user_id == current_user.id
    ).first()
    if not illustration:
        raise HTTPException(status_code=404, detail="Illustration not found")
    
    db.delete(illustration)
    db.commit()
    return {"message": "Illustration deleted"}


@router.put("/{illustration_id}", response_model=IllustrationInDB)
def update_illustration(
    illustration_id: int,
    data: IllustrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Update illustration metadata: description, tags, novel_id, illustration_type."""
    illustration = db.query(Illustration).filter(
        Illustration.id == illustration_id,
        Illustration.user_id == current_user.id
    ).first()
    if not illustration:
        raise HTTPException(status_code=404, detail="Illustration not found")
    
    # Update only provided fields
    if data.description is not None:
        illustration.description = data.description
    if data.tags is not None:
        illustration.tags = data.tags
    if data.novel_id is not None:
        # Validate novel exists and belongs to user
        from app.models.novel import Novel
        novel = db.query(Novel).filter(
            Novel.id == data.novel_id,
            Novel.user_id == current_user.id
        ).first()
        if not novel:
            raise HTTPException(status_code=404, detail="Novel not found")
        illustration.novel_id = data.novel_id
    if data.illustration_type is not None:
        illustration.illustration_type = data.illustration_type
    
    # Auto-update novel cover when illustration is set as cover type
    if illustration.novel_id and illustration.image_url:
        if illustration.illustration_type == 'cover' or (data.illustration_type == 'cover'):
            from app.models.novel import Novel
            novel = db.query(Novel).filter(Novel.id == illustration.novel_id).first()
            if novel:
                novel.cover_image_url = illustration.image_url
    
    db.commit()
    db.refresh(illustration)
    return illustration


@router.put("/{illustration_id}/unlink-novel", response_model=IllustrationInDB)
def unlink_novel(
    illustration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Remove the novel association from an illustration."""
    illustration = db.query(Illustration).filter(
        Illustration.id == illustration_id,
        Illustration.user_id == current_user.id
    ).first()
    if not illustration:
        raise HTTPException(status_code=404, detail="Illustration not found")
    
    illustration.novel_id = None
    db.commit()
    db.refresh(illustration)
    return illustration


@router.post("/batch-generate")
async def batch_generate_illustrations(
    novel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Generate one illustration per chapter of a novel (max 5 at a time)."""
    from app.models.novel import Novel
    from app.models.chapter import Chapter
    novel = db.query(Novel).filter(Novel.id == novel_id, Novel.user_id == current_user.id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    chapters = db.query(Chapter).filter(Chapter.novel_id == novel_id).order_by(Chapter.chapter_number).limit(5).all()
    results = []
    for ch in chapters:
        # Skip if chapter already has illustration
        existing = db.query(Illustration).filter(Illustration.novel_id == novel_id, Illustration.user_id == current_user.id).first()
        if existing and len(results) > 0:
            continue
        prompt = f"Illustration for chapter {ch.chapter_number}: {ch.title} of the novel \"{novel.title}\""
        try:
            ill = await illustration_service.generate_illustration(
                db=db, user_id=current_user.id, prompt=prompt, style='realistic', size='1024x1024',
            )
            ill.novel_id = novel_id
            db.commit()
            db.refresh(ill)
            results.append({"chapter_id": ch.id, "illustration_id": ill.id})
        except Exception as e:
            results.append({"chapter_id": ch.id, "error": str(e)})
    return {"generated": len(results), "results": results}
