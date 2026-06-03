from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.novel_review import NovelReview
from app.models.novel import Novel
from app.models.user import User
from app.core.security import get_current_user, get_current_user_required
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/reviews", tags=["reviews"])


class ReviewCreate(BaseModel):
    novel_id: int
    rating: int
    review_text: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    review_text: Optional[str] = None


class ReviewAuthor(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewInDB(BaseModel):
    id: int
    novel_id: int
    user_id: int
    rating: int
    review_text: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    author: Optional[ReviewAuthor] = None

    class Config:
        from_attributes = True


def _enrich_review(review: NovelReview) -> dict:
    """Convert review to dict with author info."""
    data = {
        "id": review.id,
        "novel_id": review.novel_id,
        "user_id": review.user_id,
        "rating": review.rating,
        "review_text": review.review_text,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }
    if review.author:
        data["author"] = {
            "id": review.author.id,
            "username": review.author.username,
            "display_name": review.author.display_name,
        }
    return data


@router.post("", response_model=ReviewInDB)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Create or update a review for a novel."""
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Check if novel exists
    novel = db.query(Novel).filter(Novel.id == data.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    # Check if user already reviewed this novel
    existing = db.query(NovelReview).filter(
        NovelReview.novel_id == data.novel_id,
        NovelReview.user_id == current_user.id
    ).first()
    
    if existing:
        # Update existing review
        existing.rating = data.rating
        existing.review_text = data.review_text
        db.commit()
        db.refresh(existing)
        return _enrich_review(existing)
    
    # Create new review
    review = NovelReview(
        novel_id=data.novel_id,
        user_id=current_user.id,
        rating=data.rating,
        review_text=data.review_text,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _enrich_review(review)


@router.get("/novel/{novel_id}", response_model=List[ReviewInDB])
def get_novel_reviews(
    novel_id: int,
    db: Session = Depends(get_db),
):
    """Get all reviews for a novel."""
    reviews = db.query(NovelReview).filter(
        NovelReview.novel_id == novel_id
    ).order_by(NovelReview.created_at.desc()).all()
    
    return [_enrich_review(r) for r in reviews]


@router.get("/mine", response_model=List[ReviewInDB])
def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get all reviews by current user."""
    reviews = db.query(NovelReview).filter(
        NovelReview.user_id == current_user.id
    ).order_by(NovelReview.created_at.desc()).all()
    
    return [_enrich_review(r) for r in reviews]


@router.put("/{review_id}", response_model=ReviewInDB)
def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Update user's own review."""
    review = db.query(NovelReview).filter(
        NovelReview.id == review_id,
        NovelReview.user_id == current_user.id
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if data.rating is not None:
        if data.rating < 1 or data.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        review.rating = data.rating
    
    if data.review_text is not None:
        review.review_text = data.review_text
    
    db.commit()
    db.refresh(review)
    return _enrich_review(review)


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Delete user's own review."""
    review = db.query(NovelReview).filter(
        NovelReview.id == review_id,
        NovelReview.user_id == current_user.id
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}
