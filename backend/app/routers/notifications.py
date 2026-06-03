from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.core.security import get_current_user_required
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Notification category mapping
CATEGORY_MAP = {
    'like': 'interaction',
    'comment': 'interaction',
    'follow': 'interaction',
    'mention': 'interaction',
    'group_invite': 'collaboration',
    'group_post': 'collaboration',
    'group_novel': 'collaboration',
    'novel_review': 'feedback',
    'novel_rating': 'feedback',
    'system': 'system',
    'achievement': 'achievement',
}


def get_notification_category(ntype: str) -> str:
    """Get category for a notification type."""
    return CATEGORY_MAP.get(ntype, 'other')


class NotificationSettings(BaseModel):
    enable_interaction: bool = True
    enable_collaboration: bool = True
    enable_feedback: bool = True
    enable_system: bool = True
    enable_achievement: bool = True


def create_notification(db: Session, user_id: int, actor_id: int, ntype: str, post_id: int = None, group_id: int = None, message: str = None):
    """Helper to create a notification. Call this from other routers."""
    if user_id == actor_id:
        return  # don't notify self
    db.add(Notification(
        user_id=user_id, actor_id=actor_id, type=ntype,
        post_id=post_id, group_id=group_id, message=message,
    ))
    db.commit()


@router.get("")
def get_my_notifications(
    category: Optional[str] = Query(default=None, regex="^(interaction|collaboration|feedback|system|achievement|all)$"),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get user's notifications with optional filtering by category and search."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    # Filter by category
    if category and category != 'all':
        # Get all types that belong to this category
        types_in_category = [ntype for ntype, cat in CATEGORY_MAP.items() if cat == category]
        query = query.filter(Notification.type.in_(types_in_category))
    
    # Search in message
    if search:
        query = query.filter(Notification.message.ilike(f"%{search}%"))
    
    # Order and paginate
    total = query.count()
    notifs = query.order_by(
        Notification.created_at.desc()
    ).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for n in notifs:
        result.append({
            "id": n.id,
            "type": n.type,
            "category": get_notification_category(n.type),
            "message": n.message,
            "is_read": n.is_read,
            "post_id": n.post_id,
            "group_id": n.group_id,
            "actor": {
                "id": n.actor.id,
                "username": n.actor.username,
                "display_name": n.actor.display_name,
            } if n.actor else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    
    return {
        "notifications": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (page * page_size) < total,
    }


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"unread_count": count}


@router.put("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}


@router.get("/unread-count-by-category")
def get_unread_count_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get unread counts broken down by category."""
    counts = {}
    
    # Get all unread notifications
    unread = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).all()
    
    # Count by category
    for n in unread:
        category = get_notification_category(n.type)
        counts[category] = counts.get(category, 0) + 1
    
    return counts


@router.get("/settings")
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get user's notification preferences (stored in user settings or return defaults)."""
    # For now, return default settings. Can be extended to store in database.
    return {
        "enable_interaction": True,
        "enable_collaboration": True,
        "enable_feedback": True,
        "enable_system": True,
        "enable_achievement": True,
    }


@router.put("/settings")
def update_notification_settings(
    settings: NotificationSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Update user's notification preferences."""
    # For now, just acknowledge the settings. Can be extended to store in database.
    return {
        "message": "Notification settings updated",
        "settings": settings.dict(),
    }


@router.get("/grouped")
def get_grouped_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get notifications grouped by type and date for compact display."""
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(100).all()
    
    # Group by type and date
    grouped = {}
    for n in notifs:
        date_key = n.created_at.strftime("%Y-%m-%d") if n.created_at else "unknown"
        group_key = f"{n.type}_{date_key}"
        
        if group_key not in grouped:
            grouped[group_key] = {
                "type": n.type,
                "category": get_notification_category(n.type),
                "date": date_key,
                "count": 0,
                "is_read": n.is_read,
                "actors": [],
                "latest_message": n.message,
                "latest_created_at": n.created_at.isoformat() if n.created_at else None,
            }
        
        grouped[group_key]["count"] += 1
        if n.actor:
            actor_info = {
                "id": n.actor.id,
                "username": n.actor.username,
                "display_name": n.actor.display_name,
            }
            if actor_info not in grouped[group_key]["actors"]:
                grouped[group_key]["actors"].append(actor_info)
        if not n.is_read:
            grouped[group_key]["is_read"] = False
    
    return list(grouped.values())
