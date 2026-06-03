from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.models.user import User
from app.models.post import Post
from app.models.novel import Novel
from app.core.security import get_current_user_required
from pydantic import BaseModel

router = APIRouter(prefix="/reading-progress", tags=["reading-progress"])


class ReadingProgressShareRequest(BaseModel):
    novel_id: int
    chapter_id: Optional[int] = None
    chapter_number: Optional[int] = None
    chapter_title: Optional[str] = None
    progress_percentage: Optional[float] = None
    thoughts: Optional[str] = None  # User's reading thoughts
    rating: Optional[int] = None  # 1-5 rating


@router.post("/share")
def share_reading_progress(
    data: ReadingProgressShareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Share reading progress as a post to the Ideas feed."""
    novel = db.query(Novel).filter(Novel.id == data.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    # Build the post content
    content_parts = []
    
    # Progress header
    if data.chapter_number and data.chapter_title:
        content_parts.append(f"📖 Reading Progress: {novel.title}")
        content_parts.append(f"📍 Currently at: Chapter {data.chapter_number} - {data.chapter_title}")
    elif data.chapter_number:
        content_parts.append(f"📖 Reading Progress: {novel.title}")
        content_parts.append(f"📍 Currently at: Chapter {data.chapter_number}")
    
    if data.progress_percentage:
        content_parts.append(f"📊 Progress: {data.progress_percentage:.0f}%")
    
    # User thoughts
    if data.thoughts:
        content_parts.append(f"\n💭 My thoughts:\n{data.thoughts}")
    
    # Rating
    if data.rating:
        stars = "⭐" * data.rating
        content_parts.append(f"\nRating: {stars} ({data.rating}/5)")
    
    content = "\n".join(content_parts)
    
    # Create the post
    post = Post(
        user_id=current_user.id,
        content=content,
        novel_id=data.novel_id,
        allow_comments=True,
        allow_repost=True,
        allow_share=True,
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return {
        "post_id": post.id,
        "message": "Reading progress shared successfully",
        "post": {
            "id": post.id,
            "content": post.content,
            "created_at": post.created_at.isoformat() if post.created_at else None,
        }
    }


@router.post("/share-screenshot")
def share_reading_screenshot(
    novel_id: int,
    chapter_id: Optional[int] = None,
    screenshot_url: Optional[str] = None,
    caption: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Share a reading screenshot to the Ideas feed."""
    novel = db.query(Novel).filter(Novel.id == novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    # Build the post content
    content = f"📸 Reading: {novel.title}"
    if caption:
        content += f"\n\n{caption}"
    
    # Create the post with screenshot
    post = Post(
        user_id=current_user.id,
        content=content,
        image_url=screenshot_url,
        novel_id=novel_id,
        allow_comments=True,
        allow_repost=True,
        allow_share=True,
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return {
        "post_id": post.id,
        "message": "Reading screenshot shared successfully",
        "post": {
            "id": post.id,
            "content": post.content,
            "image_url": post.image_url,
            "created_at": post.created_at.isoformat() if post.created_at else None,
        }
    }
