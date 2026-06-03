from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.tip import Tip
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.user import User


class TipService:
    """Service for managing reader tips/rewards."""

    def create_tip(
        self,
        db: Session,
        from_user_id: int,
        to_user_id: int,
        novel_id: int,
        amount: float,
        chapter_id: Optional[int] = None,
        message: Optional[str] = None,
        currency_type: str = "coins",
    ) -> Tip:
        """Create a new tip from reader to author."""
        # Verify novel exists
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            raise ValueError("Novel not found")

        # Verify chapter exists if provided
        if chapter_id:
            chapter = db.query(Chapter).filter(
                Chapter.id == chapter_id,
                Chapter.novel_id == novel_id
            ).first()
            if not chapter:
                raise ValueError("Chapter not found")

        # Create tip
        tip = Tip(
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            novel_id=novel_id,
            chapter_id=chapter_id,
            amount=amount,
            message=message,
            currency_type=currency_type,
        )

        db.add(tip)
        db.commit()
        db.refresh(tip)

        return tip

    def get_novel_tips(
        self,
        db: Session,
        novel_id: int,
        limit: int = 50,
    ) -> List[Dict]:
        """Get tips for a novel with user info."""
        tips = (
            db.query(Tip)
            .filter(Tip.novel_id == novel_id)
            .order_by(desc(Tip.amount), desc(Tip.created_at))
            .limit(limit)
            .all()
        )

        result = []
        for tip in tips:
            result.append({
                "id": tip.id,
                "amount": tip.amount,
                "message": tip.message,
                "currency_type": tip.currency_type,
                "created_at": tip.created_at.isoformat() if tip.created_at else None,
                "from_user": {
                    "id": tip.from_user.id,
                    "username": tip.from_user.username,
                    "display_name": tip.from_user.display_name,
                } if tip.from_user else None,
            })

        return result

    def get_novel_tip_stats(self, db: Session, novel_id: int) -> Dict:
        """Get tip statistics for a novel."""
        stats = db.query(
            func.count(Tip.id).label('total_tips'),
            func.sum(Tip.amount).label('total_amount'),
            func.avg(Tip.amount).label('avg_amount'),
        ).filter(Tip.novel_id == novel_id).first()

        return {
            "total_tips": stats[0] or 0,
            "total_amount": float(stats[1] or 0),
            "avg_amount": float(stats[2] or 0),
        }

    def get_user_tip_stats(self, db: Session, user_id: int) -> Dict:
        """Get tip statistics for a user (as author)."""
        # Tips received
        received_stats = db.query(
            func.count(Tip.id).label('total_received'),
            func.sum(Tip.amount).label('total_amount'),
        ).filter(Tip.to_user_id == user_id).first()

        # Top tipped novels
        top_novels = (
            db.query(
                Novel.id,
                Novel.title,
                func.sum(Tip.amount).label('total_tips')
            )
            .join(Tip, Tip.novel_id == Novel.id)
            .filter(Novel.user_id == user_id)
            .group_by(Novel.id)
            .order_by(desc(func.sum(Tip.amount)))
            .limit(5)
            .all()
        )

        return {
            "total_received": received_stats[0] or 0,
            "total_amount": float(received_stats[1] or 0),
            "top_novels": [
                {"id": n[0], "title": n[1], "total_tips": float(n[2])}
                for n in top_novels
            ],
        }

    def get_trending_tipped_novels(
        self,
        db: Session,
        limit: int = 10,
        days: int = 7,
    ) -> List[Dict]:
        """Get novels with most tips in recent days."""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        results = (
            db.query(
                Novel,
                func.count(Tip.id).label('tip_count'),
                func.sum(Tip.amount).label('total_amount')
            )
            .join(Tip, Tip.novel_id == Novel.id)
            .filter(
                Novel.is_published == True,
                Tip.created_at >= cutoff_date
            )
            .group_by(Novel.id)
            .order_by(desc(func.sum(Tip.amount)))
            .limit(limit)
            .all()
        )

        return [
            {
                "novel": {
                    "id": r[0].id,
                    "title": r[0].title,
                    "cover_image_url": r[0].cover_image_url,
                    "genre": r[0].genre,
                },
                "tip_count": r[1],
                "total_amount": float(r[2]),
            }
            for r in results
        ]


tip_service = TipService()
