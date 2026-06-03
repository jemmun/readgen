from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.like import Like
from app.models.post import Post
from app.core.security import get_current_user_required

router = APIRouter(prefix="/likes", tags=["likes"])


@router.post("/posts/{post_id}/like")
def like_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already liked")
    like = Like(post_id=post_id, user_id=current_user.id)
    db.add(like)
    db.commit()
    # Notify post author
    from app.routers.notifications import create_notification
    create_notification(db, post.user_id, current_user.id, "like", post_id=post_id, message=f"{current_user.display_name or current_user.username} liked your post")
    return {"message": "Liked"}


@router.delete("/posts/{post_id}/like")
def unlike_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required),
):
    like = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if not like:
        raise HTTPException(status_code=404, detail="Not liked")
    db.delete(like)
    db.commit()
    return {"message": "Unliked"}
