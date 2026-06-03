from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentInDB, CommentAuthor
from app.core.security import get_current_user_required
from app.core.tags import parse_message
from app.services import generation_service

router = APIRouter(prefix="/comments", tags=["comments"])


def _enrich_comment(comment: Comment) -> dict:
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "tag": comment.tag,
        "parent_id": comment.parent_id,
        "adopted": comment.adopted,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "author": CommentAuthor(
            id=comment.author.id,
            username=comment.author.username,
            display_name=comment.author.display_name,
        ) if comment.author else None,
    }


@router.post("/posts/{post_id}/comments", response_model=CommentInDB)
def create_comment(
    post_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    from app.models.post import Post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    tag_slug, cleaned_content = parse_message(data.content)
    comment = Comment(post_id=post_id, user_id=current_user.id, content=cleaned_content, tag=tag_slug or data.tag, parent_id=data.parent_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    # Notify post author
    from app.routers.notifications import create_notification
    create_notification(db, post.user_id, current_user.id, "comment", post_id=post_id, message=f"{current_user.display_name or current_user.username} commented on your post")
    # Notify @mentioned users
    import re
    mentioned_usernames = re.findall(r'@(\w+)', cleaned_content)
    if mentioned_usernames:
        for uname in set(mentioned_usernames):
            mentioned = db.query(User).filter(User.username == uname).first()
            if mentioned and mentioned.id != current_user.id:
                create_notification(db, mentioned.id, current_user.id, "mention", post_id=post_id, message=f"{current_user.display_name or current_user.username} mentioned you in a comment")
    return _enrich_comment(comment)


@router.get("/posts/{post_id}/comments", response_model=List[CommentInDB])
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
):
    from app.models.post import Post
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()
    return [_enrich_comment(c) for c in comments]


@router.post("/{comment_id}/adopt")
async def adopt_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the post author can adopt comments")
    if comment.adopted:
        raise HTTPException(status_code=400, detail="Comment already adopted")
    if not comment.post.novel_id:
        raise HTTPException(status_code=400, detail="No novel associated with this post")
    
    from app.models.novel import Novel
    novel = db.query(Novel).filter(Novel.id == comment.post.novel_id).first()
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    
    chapter = await generation_service.generate_chapter_from_comment(
        db, novel, comment.content, comment.user_id
    )
    
    comment.adopted = True
    db.commit()
    db.refresh(comment)
    
    return {
        "message": "Comment adopted and chapter generated",
        "comment": _enrich_comment(comment),
        "chapter_id": chapter.id,
    }


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
