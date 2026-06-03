from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict
from app.models.reading_progress import ReadingProgress
from app.models.novel import Novel
from app.models.novel_review import NovelReview
from app.models.like import Like


class RecommendationService:
    """Smart recommendation engine based on reading history and preferences."""

    def get_recommendations_for_user(
        self,
        db: Session,
        user_id: int,
        limit: int = 20,
    ) -> List[Novel]:
        """Get personalized novel recommendations based on:
        1. User's reading history (genre preferences)
        2. Similar users' preferences (collaborative filtering)
        3. Popular novels in user's favorite genres
        """
        # Get user's reading history
        reading_history = (
            db.query(ReadingProgress)
            .filter(ReadingProgress.user_id == user_id)
            .all()
        )

        if not reading_history:
            # Cold start: return most popular novels
            return self.get_popular_novels(db, limit)

        # Extract genres from user's reading history
        read_novel_ids = [rp.novel_id for rp in reading_history]
        
        # Get genres of novels user has read
        user_genres = (
            db.query(Novel.genre, func.count(Novel.id))
            .filter(Novel.id.in_(read_novel_ids), Novel.genre.isnot(None))
            .group_by(Novel.genre)
            .order_by(desc(func.count(Novel.id)))
            .all()
        )

        # Get top 3 preferred genres
        preferred_genres = [g[0] for g in user_genres[:3]]

        if not preferred_genres:
            return self.get_popular_novels(db, limit)

        # Get novels in preferred genres that user hasn't read
        recommended_novels = (
            db.query(Novel)
            .filter(
                Novel.is_published == True,
                Novel.id.notin_(read_novel_ids),
                Novel.genre.in_(preferred_genres)
            )
            .order_by(desc(Novel.created_at))
            .limit(limit)
            .all()
        )

        # If not enough recommendations, fill with popular novels
        if len(recommended_novels) < limit:
            additional = self.get_popular_novels(
                db, limit - len(recommended_novels), exclude_ids=read_novel_ids
            )
            recommended_novels.extend(additional)

        return recommended_novels[:limit]

    def get_popular_novels(
        self,
        db: Session,
        limit: int,
        exclude_ids: List[int] = None,
    ) -> List[Novel]:
        """Get popular novels based on reviews and engagement."""
        query = (
            db.query(
                Novel,
                func.avg(NovelReview.rating).label('avg_rating'),
                func.count(NovelReview.id).label('review_count')
            )
            .outerjoin(NovelReview)
            .filter(Novel.is_published == True)
            .group_by(Novel.id)
        )

        if exclude_ids:
            query = query.filter(Novel.id.notin_(exclude_ids))

        # Order by rating * log(review_count + 1)
        novels = query.order_by(
            desc(func.avg(NovelReview.rating) * func.log(func.count(NovelReview.id) + 1))
        ).limit(limit).all()

        return [n[0] for n in novels]

    def get_similar_novels(
        self,
        db: Session,
        novel_id: int,
        limit: int = 10,
    ) -> List[Novel]:
        """Get novels similar to a specific novel based on genre and style."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return []

        # Find novels with same genre and/or style
        query = (
            db.query(Novel)
            .filter(
                Novel.is_published == True,
                Novel.id != novel_id
            )
        )

        # Same genre is most important
        if novel.genre:
            query = query.filter(Novel.genre == novel.genre)
        
        # Same style is secondary
        if novel.style:
            query = query.filter(Novel.style == novel.style)

        return query.order_by(desc(Novel.created_at)).limit(limit).all()

    def get_trending_in_genre(
        self,
        db: Session,
        genre: str,
        limit: int = 10,
        days: int = 7,
    ) -> List[Novel]:
        """Get trending novels in a specific genre."""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        return (
            db.query(Novel)
            .filter(
                Novel.is_published == True,
                Novel.genre == genre,
                Novel.created_at >= cutoff_date
            )
            .order_by(desc(Novel.created_at))
            .limit(limit)
            .all()
        )


recommendation_service = RecommendationService()
