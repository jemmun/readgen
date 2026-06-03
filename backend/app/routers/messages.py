from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models.message import Message
from app.models.user import User
from app.core.security import get_current_user_required

router = APIRouter(prefix="/messages", tags=["messages"])


class MessageSend(BaseModel):
    receiver_id: int
    content: str


@router.post("")
def send_message(
    data: MessageSend,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    if data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    target = db.query(User).filter(User.id == data.receiver_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    msg = Message(sender_id=current_user.id, receiver_id=data.receiver_id, content=data.content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    # Notify receiver
    from app.routers.notifications import create_notification
    create_notification(db, data.receiver_id, current_user.id, "mention", message=f"Sent you a message")
    return {"id": msg.id, "message": "Message sent"}


@router.get("/conversations")
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get list of conversation partners with last message."""
    from sqlalchemy import func, or_, and_, desc
    # Get latest message for each conversation
    messages = db.query(Message).filter(
        or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id)
    ).order_by(Message.created_at.desc()).all()
    
    seen = set()
    conversations = []
    for m in messages:
        partner_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        if partner_id not in seen:
            seen.add(partner_id)
            partner = m.receiver if m.sender_id == current_user.id else m.sender
            conversations.append({
                "partner_id": partner_id,
                "partner": {
                    "id": partner.id,
                    "username": partner.username,
                    "display_name": partner.display_name,
                } if partner else None,
                "last_message": m.content,
                "last_at": m.created_at,
            })
    return conversations


@router.get("/with/{user_id}")
def get_conversation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    from sqlalchemy import or_, and_
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
            and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
        )
    ).order_by(Message.created_at.asc()).limit(100).all()
    # Mark unread as read
    for m in messages:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = 1
    db.commit()
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "content": m.content,
            "is_read": m.is_read,
            "created_at": m.created_at,
        }
        for m in messages
    ]
