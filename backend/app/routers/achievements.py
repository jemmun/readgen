from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models import Achievement, UserAchievement, Novel, NovelReview, Follow, Group, GroupMember, Post
from app.schemas import AchievementOut, UserAchievementOut
from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/", response_model=List[AchievementOut])
def list_achievements(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all achievements, optionally filtered by category."""
    query = db.query(Achievement)
    if category:
        query = query.filter(Achievement.category == category)
    return query.order_by(Achievement.category, Achievement.id).all()


@router.get("/my", response_model=List[UserAchievementOut])
def get_my_achievements(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's achievements with progress."""
    query = (
        db.query(Achievement, UserAchievement)
        .outerjoin(
            UserAchievement,
            (Achievement.id == UserAchievement.achievement_id)
            & (UserAchievement.user_id == current_user.id)
        )
    )
    if category:
        query = query.filter(Achievement.category == category)
    
    achievements_with_progress = query.order_by(Achievement.category, Achievement.id).all()
    
    result = []
    for achievement, user_achievement in achievements_with_progress:
        result.append({
            "id": achievement.id,
            "key": achievement.key,
            "name": achievement.name,
            "description": achievement.description,
            "icon": achievement.icon,
            "category": achievement.category,
            "requirement_type": achievement.requirement_type,
            "requirement_value": achievement.requirement_value,
            "created_at": achievement.created_at,
            "user_achievement_id": user_achievement.id if user_achievement else None,
            "progress": user_achievement.progress if user_achievement else 0,
            "is_unlocked": user_achievement.is_unlocked if user_achievement else False,
            "unlocked_at": user_achievement.unlocked_at if user_achievement else None,
        })
    
    return result


@router.post("/check")
def check_and_update_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check and update achievement progress for current user. Returns newly unlocked achievements."""
    newly_unlocked = []
    
    # Get all achievements
    achievements = db.query(Achievement).all()
    
    for achievement in achievements:
        # Calculate current progress based on requirement_type and key
        progress = _calculate_progress(db, current_user.id, achievement)
        
        # Get or create UserAchievement record
        user_achievement = db.query(UserAchievement).filter(
            UserAchievement.user_id == current_user.id,
            UserAchievement.achievement_id == achievement.id
        ).first()
        
        if not user_achievement:
            user_achievement = UserAchievement(
                user_id=current_user.id,
                achievement_id=achievement.id,
                progress=0,
                is_unlocked=False
            )
            db.add(user_achievement)
        
        # Update progress
        user_achievement.progress = progress
        
        # Check if should unlock
        if progress >= achievement.requirement_value and not user_achievement.is_unlocked:
            user_achievement.is_unlocked = True
            user_achievement.unlocked_at = datetime.utcnow()
            newly_unlocked.append({
                "id": achievement.id,
                "key": achievement.key,
                "name": achievement.name,
                "description": achievement.description,
                "icon": achievement.icon,
            })
    
    db.commit()
    
    return {
        "newly_unlocked": newly_unlocked,
        "count": len(newly_unlocked)
    }


def _calculate_progress(db: Session, user_id: int, achievement: Achievement) -> int:
    """Calculate progress for a specific achievement."""
    key = achievement.key
    requirement_type = achievement.requirement_type
    
    # Writing achievements
    if key == "first_novel" or key == "prolific_writer" or key == "novel_master":
        count = db.query(func.count(Novel.id)).filter(Novel.author_id == user_id).scalar()
        return count or 0
    
    elif key == "chapter_master":
        # Count total chapters across all novels
        from app.models import Chapter
        count = db.query(func.count(Chapter.id)).join(Novel).filter(Novel.author_id == user_id).scalar()
        return count or 0
    
    elif key == "word_warrior":
        # Total word count across all novels
        total_words = db.query(func.sum(Novel.total_word_count)).filter(Novel.author_id == user_id).scalar()
        return total_words or 0
    
    # Reading achievements
    elif key == "avid_reader" or key == "bookworm":
        # Count novels user has read (has chapters they've viewed)
        # For now, count follows as a proxy
        count = db.query(func.count(Follow.id)).filter(Follow.user_id == user_id, Follow.followed_novel_id.isnot(None)).scalar()
        return count or 0
    
    elif key == "reviewer":
        count = db.query(func.count(NovelReview.id)).filter(NovelReview.user_id == user_id).scalar()
        return count or 0
    
    # Social achievements
    elif key == "social_butterfly":
        # Count followers
        count = db.query(func.count(Follow.id)).filter(Follow.followed_user_id == user_id).scalar()
        return count or 0
    
    elif key == "popular_author":
        # Count total reviews on user's novels
        count = db.query(func.count(NovelReview.id)).join(Novel).filter(Novel.author_id == user_id).scalar()
        return count or 0
    
    elif key == "idea_contributor":
        # For now, use a placeholder - would need to track idea contributions
        return 0
    
    elif key == "well_liked":
        # Average rating on user's reviews
        avg_rating = db.query(func.avg(NovelReview.rating)).filter(NovelReview.user_id == user_id).scalar()
        return int(avg_rating * 10) if avg_rating else 0  # Scale to integer
    
    # Collaboration achievements
    elif key == "team_player" or key == "collaborative_writer":
        # Count group memberships
        from app.models import GroupMember
        count = db.query(func.count(GroupMember.id)).filter(GroupMember.user_id == user_id).scalar()
        return count or 0
    
    elif key == "group_leader":
        # Count groups where user is leader
        from app.models import GroupMember
        count = db.query(func.count(GroupMember.id)).join(Group).filter(
            GroupMember.user_id == user_id,
            Group.leader_id == user_id
        ).scalar()
        return count or 0
    
    elif key == "active_member":
        # Count group posts (using Post model for now)
        count = db.query(func.count(Post.id)).filter(Post.author_id == user_id).scalar()
        return count or 0
    
    # Default
    return 0