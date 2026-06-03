from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.post import Post
from app.models.message import Message
from app.models.novel import Novel
from app.models.user import User
from app.schemas.group import GroupCreate, GroupUpdate, GroupInDB, GroupMemberCreate
from app.core.security import get_current_user_required
from app.services import generation_service

router = APIRouter(prefix="/groups", tags=["groups"])


def _enrich_group(group: Group, current_user: User = None, db: Session = None) -> dict:
    my_role = None
    if current_user and db:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group.id,
            GroupMember.user_id == current_user.id
        ).first()
        if membership:
            my_role = membership.role
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "owner_id": group.owner_id,
        "is_private": group.is_private,
        "created_at": group.created_at,
        "owner": {
            "id": group.owner.id,
            "username": group.owner.username,
            "display_name": group.owner.display_name,
        } if group.owner else None,
        "member_count": len(group.members),
        "my_role": my_role,
    }


@router.post("", response_model=GroupInDB)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = Group(
        name=data.name,
        description=data.description,
        is_private=data.is_private,
        owner_id=current_user.id,
    )
    db.add(group)
    db.flush()
    
    # Add creator as owner
    member = GroupMember(group_id=group.id, user_id=current_user.id, role="owner")
    db.add(member)
    db.commit()
    db.refresh(group)
    
    return _enrich_group(group, current_user, db)


@router.get("", response_model=List[GroupInDB])
def get_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    return [_enrich_group(g, current_user, db) for g in groups]


@router.get("/discover", response_model=List[GroupInDB])
def discover_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """List public groups the user is not yet a member of."""
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
    joined_ids = {m.group_id for m in memberships}
    public_groups = db.query(Group).filter(Group.is_private == False).order_by(Group.created_at.desc()).limit(50).all()
    return [_enrich_group(g, current_user, db) for g in public_groups if g.id not in joined_ids]


@router.get("/{group_id}", response_model=GroupInDB)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check membership for private groups
    if group.is_private:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this group")
    
    return _enrich_group(group, current_user, db)


@router.put("/{group_id}", response_model=GroupInDB)
def update_group(
    group_id: int,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can update group")
    
    if data.name is not None:
        group.name = data.name
    if data.description is not None:
        group.description = data.description
    if data.is_private is not None:
        group.is_private = data.is_private
    
    db.commit()
    db.refresh(group)
    return _enrich_group(group, current_user, db)


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete group")
    
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}


@router.post("/{group_id}/members")
def add_member(
    group_id: int,
    data: GroupMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Allow self-join for public groups (user_id=0 means join self)
    target_user_id = data.user_id if data.user_id else current_user.id
    if target_user_id != current_user.id and group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can add other members")
    if target_user_id == current_user.id and group.is_private:
        raise HTTPException(status_code=403, detail="Cannot join private group without invitation")
    
    # Check if already member
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already a member")
    
    role = data.role if data.role and group.owner_id == current_user.id else "member"
    member = GroupMember(group_id=group_id, user_id=target_user_id, role=role)
    db.add(member)
    db.commit()
    return {"message": "Member added"}


@router.get("/{group_id}/members")
def get_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check membership for private groups
    if group.is_private:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this group")
    
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [
        {
            "id": m.user.id,
            "username": m.user.username,
            "display_name": m.user.display_name,
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m in members
    ]


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Only owner can remove members")
    if group.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove group owner")
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(membership)
    db.commit()
    return {"message": "Member removed"}



@router.put("/{group_id}/members/{user_id}/role")
def update_member_role(
    group_id: int,
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Update a member's role. Only the group owner can promote/demote members.
    Valid roles: member, admin. Owner cannot be changed."""
    if role not in ("member", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'member' or 'admin'")
    
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage roles")
    
    # Cannot change owner's role
    if group.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot change owner's role")
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    
    membership.role = role
    db.commit()
    return {"message": f"Member role updated to {role}", "user_id": user_id, "role": role}


@router.get("/{group_id}/posts")
def get_group_posts(
    group_id: int,
    tag: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    from app.schemas.post import PostAuthor
    
    # Check membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    is_admin = membership.role in ("owner", "admin", "reviewer")
    
    query = db.query(Post).filter(Post.group_id == group_id)
    
    # Admin sees all; regular members see approved + their own pending
    if not is_admin:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Post.status == "approved",
                Post.user_id == current_user.id,
            )
        )
    elif status_filter:
        query = query.filter(Post.status == status_filter)
    
    if tag:
        query = query.filter(Post.tag == tag)
    posts = query.order_by(Post.created_at.desc()).all()
    
    return [
        {
            "id": post.id,
            "user_id": post.user_id,
            "novel_id": post.novel_id,
            "group_id": post.group_id,
            "content": post.content,
            "tag": post.tag,
            "image_url": post.image_url,
            "status": post.status,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "author": PostAuthor(
                id=post.author.id,
                username=post.author.username,
                display_name=post.author.display_name,
            ) if post.author else None,
            "like_count": len(post.likes),
            "comment_count": len(post.comments),
            "is_liked_by_me": any(l.user_id == current_user.id for l in post.likes),
        }
        for post in posts
    ]


@router.post("/{group_id}/posts/{post_id}/approve")
def approve_post(
    group_id: int,
    post_id: int,
    note: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership or membership.role not in ("owner", "admin", "reviewer"):
        raise HTTPException(status_code=403, detail="Only admin can approve messages")
    
    post = db.query(Post).filter(Post.id == post_id, Post.group_id == group_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == "approved":
        raise HTTPException(status_code=400, detail="Post already approved")
    
    post.status = "approved"
    if note:
        post.approval_note = note
    db.commit()
    return {"message": "Post approved", "post_id": post_id, "status": "approved"}


@router.post("/{group_id}/posts/{post_id}/reject")
def reject_post(
    group_id: int,
    post_id: int,
    note: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership or membership.role not in ("owner", "admin", "reviewer"):
        raise HTTPException(status_code=403, detail="Only admin can reject messages")
    
    post = db.query(Post).filter(Post.id == post_id, Post.group_id == group_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status == "rejected":
        raise HTTPException(status_code=400, detail="Post already rejected")
    
    post.status = "rejected"
    if note:
        post.approval_note = note
    db.commit()
    return {"message": "Post rejected", "post_id": post_id, "status": "rejected"}


@router.post("/{group_id}/novel-design")
async def generate_novel_design_from_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Admin-only: synthesize a novel design from all tagged, approved posts in the group."""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership or membership.role not in ("owner", "admin", "reviewer"):
        raise HTTPException(status_code=403, detail="Only group admins can generate novels")
    
    # Collect all approved posts with tags
    from app.core.tags import get_tag_by_slug
    posts = db.query(Post).filter(
        Post.group_id == group_id,
        Post.status == "approved",
        Post.tag.isnot(None)
    ).order_by(Post.created_at.asc()).all()
    
    if not posts:
        raise HTTPException(status_code=400, detail="No tagged messages found in this group. Members need to post ideas with tags first.")
    
    post_inputs = []
    for p in posts:
        tag_def = get_tag_by_slug(p.tag) if p.tag else None
        post_inputs.append({
            "content": p.content,
            "tag": p.tag,
            "tag_label": tag_def.label if tag_def else p.tag,
            "tag_emoji": tag_def.emoji if tag_def else "",
        })
    
    design = await generation_service.synthesize_novel_design_from_posts(post_inputs)
    design["group_id"] = group_id
    return design


@router.post("/{group_id}/assign-chapter")
def assign_chapter(
    group_id: int,
    chapter_number: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Assign a chapter number to a group member for collaborative writing."""
    from app.models.group import Group
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()
    if not membership or membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only admin can assign chapters")
    target = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == member_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    # Store assignment as a group post with special tag
    post = Post(
        group_id=group_id, user_id=current_user.id,
        content=f"📝 Chapter {chapter_number} assigned to member {member_id}",
        tag="assignment", status="approved",
    )
    db.add(post)
    db.commit()
    return {"message": "Chapter assigned", "chapter_number": chapter_number, "member_id": member_id}


@router.get("/leaderboard")
def get_group_leaderboard(
    period: str = Query(default="weekly", regex="^(daily|weekly|monthly|all)$"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get group leaderboard based on activity metrics."""
    # Calculate time range
    now = datetime.utcnow()
    if period == "daily":
        start_date = now - timedelta(days=1)
    elif period == "weekly":
        start_date = now - timedelta(weeks=1)
    elif period == "monthly":
        start_date = now - timedelta(days=30)
    else:  # all time
        start_date = datetime(2000, 1, 1)
    
    # Get all groups with their metrics
    groups = db.query(Group).filter(Group.is_private == False).all()
    
    leaderboard = []
    for group in groups:
        # Count members
        member_count = db.query(func.count(GroupMember.id)).filter(
            GroupMember.group_id == group.id
        ).scalar() or 0
        
        # Count messages in period
        message_count = db.query(func.count(Message.id)).filter(
            Message.group_id == group.id,
            Message.created_at >= start_date
        ).scalar() or 0
        
        # Count posts in period
        post_count = db.query(func.count(Post.id)).filter(
            Post.group_id == group.id,
            Post.created_at >= start_date,
            Post.status == "approved"
        ).scalar() or 0
        
        # Count novels created by group members
        member_ids = [m.user_id for m in db.query(GroupMember).filter(
            GroupMember.group_id == group.id
        ).all()]
        
        novel_count = 0
        total_word_count = 0
        if member_ids:
            novels = db.query(Novel).filter(
                Novel.user_id.in_(member_ids),
                Novel.created_at >= start_date,
                Novel.is_published == True
            ).all()
            novel_count = len(novels)
            total_word_count = sum(n.total_word_count for n in novels)
        
        # Calculate activity score
        # Formula: messages * 1 + posts * 5 + novels * 20 + words / 1000 * 2 + members * 3
        activity_score = (
            message_count * 1 +
            post_count * 5 +
            novel_count * 20 +
            (total_word_count / 1000) * 2 +
            member_count * 3
        )
        
        leaderboard.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "owner": {
                "id": group.owner.id,
                "username": group.owner.username,
                "display_name": group.owner.display_name,
            } if group.owner else None,
            "member_count": member_count,
            "activity_score": round(activity_score, 2),
            "metrics": {
                "messages": message_count,
                "posts": post_count,
                "novels": novel_count,
                "total_words": total_word_count,
            },
            "created_at": group.created_at,
        })
    
    # Sort by activity score
    leaderboard.sort(key=lambda x: x["activity_score"], reverse=True)
    
    return {
        "period": period,
        "groups": leaderboard[:limit],
        "total": len(leaderboard[:limit])
    }
