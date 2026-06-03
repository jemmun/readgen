from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.creation_challenge_service import creation_challenge_service
from app.models.user import User
from app.core.security import get_current_user_required, get_current_user

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("/daily")
def get_daily_challenge():
    """Get today's writing challenge."""
    return creation_challenge_service.get_daily_challenge()


@router.get("/weekly")
def get_weekly_challenge():
    """Get the current weekly challenge."""
    return creation_challenge_service.get_weekly_challenge()


@router.get("/prompts")
def get_random_prompts(
    category: Optional[str] = None,
    count: int = Query(default=5, ge=1, le=20),
):
    """Get random writing prompts."""
    prompts = creation_challenge_service.get_random_prompts(
        category=category,
        count=count,
    )
    return {"prompts": prompts}


@router.get("/prompts/categories")
def get_prompt_categories():
    """List all prompt categories."""
    categories = creation_challenge_service.get_all_categories()
    return {"categories": categories}


@router.post("/custom")
def generate_custom_challenge(
    genre: str = "any",
    difficulty: str = "medium",
    word_count_target: int = 2000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a custom writing challenge based on preferences."""
    challenge = creation_challenge_service.generate_custom_challenge(
        genre=genre,
        difficulty=difficulty,
        word_count_target=word_count_target,
    )
    return challenge
