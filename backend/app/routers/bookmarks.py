from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.bookmark import Bookmark
from app.models.post import Post
from app.models.user import User
from app.core.security import get_current_user_required

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.post("/posts/{post_id}/bookmark")
def bookmark_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    existing = db.query(Bookmark).filter(Bookmark.post_id == post_id, Bookmark.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already bookmarked")
    db.add(Bookmark(post_id=post_id, user_id=current_user.id))
    db.commit()
    return {"message": "Bookmarked"}


@router.delete("/posts/{post_id}/bookmark")
def unbookmark_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    bm = db.query(Bookmark).filter(Bookmark.post_id == post_id, Bookmark.user_id == current_user.id).first()
    if not bm:
        raise HTTPException(status_code=404, detail="Not bookmarked")
    db.delete(bm)
    db.commit()
    return {"message": "Unbookmarked"}


@router.get("/mine")
def get_my_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).order_by(Bookmark.created_at.desc()).all()
    return [
        {
            "id": bm.id,
            "post_id": bm.post_id,
            "post": {
                "id": bm.post.id,
                "content": bm.post.content,
                "image_url": bm.post.image_url,
                "created_at": bm.post.created_at,
                "author": {
                    "id": bm.post.author.id,
                    "username": bm.post.author.username,
                    "display_name": bm.post.author.display_name,
                } if bm.post.author else None,
            } if bm.post else None,
            "created_at": bm.created_at,
        }
        for bm in bookmarks
    ]
