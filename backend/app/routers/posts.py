from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import shutil
from app.db.session import get_db
from app.models.post import Post
from app.models.novel import Novel
from app.models.user import User
from app.models.like import Like
from app.schemas.post import PostCreate, PostInDB, PostAuthor, PostUpdate
from app.schemas.novel import NovelInDB
from app.core.security import get_current_user, get_current_user_required
from app.core.tags import parse_message
from app.services import generation_service, novel_service
from pydantic import BaseModel

router = APIRouter(prefix="/posts", tags=["posts"])


class ImageUploadResponse(BaseModel):
    url: str


@router.post("/upload-image", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_required),
):
    """Upload an image file and return the URL."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 10MB)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 10MB"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = os.path.join("uploads", "posts")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save image: {str(e)}"
        )
    
    # Return URL (relative path)
    image_url = f"/uploads/posts/{unique_filename}"
    return ImageUploadResponse(url=image_url)


def _enrich_post(post: Post, current_user_id: Optional[int] = None) -> dict:
    # Parse image_urls from JSON if available
    image_urls = []
    if post.image_urls:
        try:
            image_urls = json.loads(post.image_urls)
        except:
            image_urls = []
    # Backward compatibility: if image_urls is empty but image_url exists, use it
    if not image_urls and post.image_url:
        image_urls = [post.image_url]
    
    result = {
        "id": post.id,
        "user_id": post.user_id,
        "novel_id": post.novel_id,
        "group_id": post.group_id,
        "content": post.content,
        "tag": post.tag,
        "status": post.status,
        "approval_note": post.approval_note,
        "image_url": post.image_url,
        "image_urls": image_urls,
        "allow_comments": post.allow_comments if post.allow_comments is not None else True,
        "allow_repost": post.allow_repost if post.allow_repost is not None else True,
        "allow_share": post.allow_share if post.allow_share is not None else True,
        "repost_of": post.repost_of,
        "repost_count": len(post.reposts) if post.reposts else 0,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "author": PostAuthor(
            id=post.author.id,
            username=post.author.username,
            display_name=post.author.display_name,
        ) if post.author else None,
        "like_count": len(post.likes),
        "comment_count": len(post.comments),
        "is_liked_by_me": any(l.user_id == current_user_id for l in post.likes) if current_user_id else False,
        "reposters": [
            PostAuthor(
                id=r.author.id,
                username=r.author.username,
                display_name=r.author.display_name,
            )
            for r in (post.reposts or [])
            if r.author
        ],
        "likers": [
            PostAuthor(
                id=l.user.id,
                username=l.user.username,
                display_name=l.user.display_name,
            )
            for l in post.likes
            if l.user
        ],
    }
    # Include original post info if this is a repost
    if post.original_post:
        result["original_post"] = {
            "id": post.original_post.id,
            "user_id": post.original_post.user_id,
            "content": post.original_post.content,
            "created_at": post.original_post.created_at,
            "author": PostAuthor(
                id=post.original_post.author.id,
                username=post.original_post.author.username,
                display_name=post.original_post.author.display_name,
            ) if post.original_post.author else None,
        }
    return result


@router.post("", response_model=PostInDB)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    # Parse slash-command tag from content
    tag_slug, cleaned_content = parse_message(data.content)

    # Determine status: group messages with tags need admin approval
    effective_status = data.status or "approved"
    if data.group_id and tag_slug:
        effective_status = "pending"

    # Handle image_urls: convert to JSON string
    image_urls_json = None
    if data.image_urls and len(data.image_urls) > 0:
        image_urls_json = json.dumps(data.image_urls)
        # Also set legacy image_url to first image for backward compatibility
        if not data.image_url:
            data.image_url = data.image_urls[0]

    post = Post(
        user_id=current_user.id,
        content=cleaned_content,
        tag=tag_slug or data.tag,
        image_url=data.image_url,
        image_urls=image_urls_json,
        group_id=data.group_id,
        status=effective_status,
        allow_comments=data.allow_comments,
        allow_repost=data.allow_repost,
        allow_share=data.allow_share,
        repost_of=data.repost_of,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _enrich_post(post, current_user.id)


@router.get("/feed", response_model=List[PostInDB])
def get_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    from app.models.follow import Follow
    following_ids = [f.following_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()]
    following_ids.append(current_user.id)
    posts = db.query(Post).filter(Post.user_id.in_(following_ids), Post.group_id == None).order_by(Post.created_at.desc()).limit(50).all()
    return [_enrich_post(p, current_user.id) for p in posts]


@router.get("/trending", response_model=List[PostInDB])
def get_trending_posts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    from sqlalchemy import func
    posts = db.query(Post).filter(Post.group_id == None).all()
    user_id = current_user.id if current_user else None
    enriched = [_enrich_post(p, user_id) for p in posts]
    # Sort by engagement score: likes + comments + reposts
    enriched.sort(
        key=lambda p: (p.get("like_count", 0) + p.get("comment_count", 0) + p.get("repost_count", 0)),
        reverse=True
    )
    return enriched[:50]


@router.get("", response_model=List[PostInDB])
def get_all_posts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    posts = db.query(Post).filter(Post.group_id == None).order_by(Post.created_at.desc()).limit(100).all()
    user_id = current_user.id if current_user else None
    return [_enrich_post(p, user_id) for p in posts]


@router.get("/{post_id}", response_model=PostInDB)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user_id = current_user.id if current_user else None
    return _enrich_post(post, user_id)


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@router.put("/{post_id}", response_model=PostInDB)
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.content is not None:
        post.content = data.content
    if data.image_url is not None:
        post.image_url = data.image_url
    if data.image_urls is not None:
        post.image_urls = json.dumps(data.image_urls) if data.image_urls else None
        # Update legacy image_url to first image
        if data.image_urls and len(data.image_urls) > 0:
            post.image_url = data.image_urls[0]
    db.commit()
    db.refresh(post)
    return _enrich_post(post, current_user.id)


@router.post("/{post_id}/repost", response_model=PostInDB)
def repost_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    original = db.query(Post).filter(Post.id == post_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Post not found")
    if not original.allow_repost:
        raise HTTPException(status_code=403, detail="Reposting is disabled for this post")
    
    repost = Post(
        user_id=current_user.id,
        content=original.content,
        repost_of=post_id,
        image_url=original.image_url,
        tag=original.tag,
        allow_comments=True,
        allow_repost=True,
        allow_share=True,
    )
    db.add(repost)
    db.commit()
    db.refresh(repost)
    return _enrich_post(repost, current_user.id)


@router.post("/{post_id}/forward-to-group/{group_id}", response_model=PostInDB)
def forward_to_group(
    post_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    from app.models.group_member import GroupMember
    
    original = db.query(Post).filter(Post.id == post_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Post not found")
    if not original.allow_repost:
        raise HTTPException(status_code=403, detail="Forwarding is disabled for this post")
    
    # Check group membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    forward = Post(
        user_id=current_user.id,
        content=original.content,
        repost_of=post_id,
        group_id=group_id,
        image_url=original.image_url,
        tag=original.tag,
        status="approved",
        allow_comments=True,
        allow_repost=True,
        allow_share=True,
    )
    db.add(forward)
    db.commit()
    db.refresh(forward)
    return _enrich_post(forward, current_user.id)


@router.post("/{post_id}/generate-novel", response_model=NovelInDB)
async def generate_novel_from_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the post author can generate a novel")
    if post.novel_id:
        raise HTTPException(status_code=400, detail="Novel already generated from this post")
    
    design = await generation_service.extract_novel_design_from_post(post.content)
    
    novel = Novel(
        user_id=current_user.id,
        title=design.get("title", "Untitled Novel"),
        theme_description=design.get("theme_description", post.content),
        genre=design.get("genre"),
        style=design.get("style"),
        tone=design.get("tone"),
        setting=design.get("setting"),
        protagonist_info=design.get("protagonist_info"),
        target_audience=design.get("target_audience"),
        language=design.get("language", "en"),
        max_chapters=20,
    )
    db.add(novel)
    db.commit()
    db.refresh(novel)
    
    post.novel_id = novel.id
    db.commit()
    
    return novel
