from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.follow import Follow
from app.models.user import User
from app.core.security import get_current_user_required

router = APIRouter(prefix="/follows", tags=["follows"])


@router.post("/users/{user_id}/follow")
def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already following")
    follow = Follow(follower_id=current_user.id, following_id=user_id)
    db.add(follow)
    db.commit()
    # Notify followed user
    from app.routers.notifications import create_notification
    create_notification(db, user_id, current_user.id, "follow", message=f"{current_user.display_name or current_user.username} started following you")
    return {"message": "Followed"}


@router.delete("/users/{user_id}/unfollow")
def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
    ).first()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following")
    db.delete(follow)
    db.commit()
    return {"message": "Unfollowed"}


@router.get("/users/{user_id}/is-following")
def is_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.following_id == user_id,
    ).first()
    return {"is_following": follow is not None}
