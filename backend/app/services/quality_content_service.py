from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.models.novel import Novel
from app.models.novel_review import NovelReview
from app.models.like import Like
from app.models.reading_progress import ReadingProgress
from app.models.tip import Tip


class QualityContentService:
    """Quality-based content recommendation with scoring algorithms."""

    @staticmethod
    def calculate_quality_score(novel: Novel, db: Session) -> Dict:
        """
        Calculate comprehensive quality score for a novel.
        Considers: ratings, reviews, engagement, completion, word count.
        """
        # Get review statistics
        review_stats = db.query(
            func.count(NovelReview.id).label('review_count'),
            func.coalesce(func.avg(NovelReview.rating), 0).label('avg_rating')
        ).filter(NovelReview.novel_id == novel.id).first()
        
        review_count = review_stats.review_count if review_stats else 0
        avg_rating = float(review_stats.avg_rating) if review_stats else 0
        
        # Get engagement metrics
        like_count = db.query(func.count(Like.id)).filter(
            Like.target_type == 'novel',
            Like.target_id == novel.id
        ).scalar() or 0
        
        reader_count = db.query(func.count(ReadingProgress.user_id)).filter(
            ReadingProgress.novel_id == novel.id
        ).distinct().scalar() or 0
        
        tip_count = db.query(func.count(Tip.id)).filter(
            Tip.novel_id == novel.id
        ).scalar() or 0
        
        # Calculate weighted score (0-100)
        # Rating component (0-40 points)
        rating_score = (avg_rating / 5.0) * 40 if avg_rating > 0 else 0
        
        # Review engagement (0-20 points) - log scale to prevent domination
        import math
        review_score = min(20, math.log(review_count + 1) * 5)
        
        # Reader engagement (0-20 points)
        reader_score = min(20, math.log(reader_count + 1) * 4)
        
        # Social engagement (likes + tips) (0-10 points)
        social_score = min(10, math.log(like_count + tip_count + 1) * 2)
        
        # Completion bonus (0-10 points)
        completion_score = 10 if novel.status == 'completed' else 5
        
        total_score = rating_score + review_score + reader_score + social_score + completion_score
        
        return {
            "novel_id": novel.id,
            "title": novel.title,
            "overall_score": round(total_score, 2),
            "components": {
                "rating_score": round(rating_score, 2),
                "review_score": round(review_score, 2),
                "reader_score": round(reader_score, 2),
                "social_score": round(social_score, 2),
                "completion_score": completion_score,
            },
            "metrics": {
                "avg_rating": round(avg_rating, 2),
                "review_count": review_count,
                "like_count": like_count,
                "reader_count": reader_count,
                "tip_count": tip_count,
                "is_completed": novel.status == 'completed',
            }
        }

    @staticmethod
    def get_editors_picks(
        db: Session,
        limit: int = 20,
        genre: Optional[str] = None,
    ) -> List[Dict]:
        """
        Get editor's picks - high-quality novels curated by algorithm.
        Combines quality score with recency and diversity.
        """
        # Get published novels
        query = db.query(Novel).filter(Novel.is_published == True)
        
        if genre:
            query = query.filter(Novel.genre == genre)
        
        novels = query.order_by(desc(Novel.created_at)).limit(limit * 2).all()
        
        # Calculate quality scores and sort
        scored_novels = []
        for novel in novels:
            score_data = QualityContentService.calculate_quality_score(novel, db)
            scored_novels.append({
                "novel": novel,
                "score": score_data["overall_score"],
                "score_details": score_data,
            })
        
        # Sort by quality score
        scored_novels.sort(key=lambda x: x["score"], reverse=True)
        
        # Return top novels with enriched data
        results = []
        for item in scored_novels[:limit]:
            novel = item["novel"]
            results.append({
                "id": novel.id,
                "title": novel.title,
                "genre": novel.genre,
                "author": novel.author.username if novel.author else None,
                "quality_score": item["score"],
                "score_details": item["score_details"],
                "created_at": novel.created_at.isoformat() if novel.created_at else None,
                "cover_image_url": novel.cover_image_url,
            })
        
        return results

    @staticmethod
    def get_trending_now(
        db: Session,
        limit: int = 20,
        days: int = 7,
        genre: Optional[str] = None,
    ) -> List[Dict]:
        """
        Get currently trending novels based on recent engagement velocity.
        Measures growth in readers, reviews, and likes over time period.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get recently active novels
        query = (
            db.query(Novel)
            .filter(
                Novel.is_published == True,
                Novel.created_at >= cutoff_date - timedelta(days=30)
            )
        )
        
        if genre:
            query = query.filter(Novel.genre == genre)
        
        novels = query.all()
        
        trending = []
        for novel in novels:
            # Count recent activity
            recent_reviews = db.query(func.count(NovelReview.id)).filter(
                NovelReview.novel_id == novel.id,
                NovelReview.created_at >= cutoff_date
            ).scalar() or 0
            
            recent_likes = db.query(func.count(Like.id)).filter(
                Like.target_type == 'novel',
                Like.target_id == novel.id,
                Like.created_at >= cutoff_date
            ).scalar() or 0
            
            recent_readers = db.query(func.count(ReadingProgress.id)).filter(
                ReadingProgress.novel_id == novel.id,
                ReadingProgress.updated_at >= cutoff_date
            ).scalar() or 0
            
            # Calculate trending score (velocity-based)
            trending_score = (recent_reviews * 3) + (recent_likes * 2) + (recent_readers * 1)
            
            if trending_score > 0:  # Only include if there's activity
                trending.append({
                    "id": novel.id,
                    "title": novel.title,
                    "genre": novel.genre,
                    "author": novel.author.username if novel.author else None,
                    "trending_score": trending_score,
                    "recent_activity": {
                        "reviews": recent_reviews,
                        "likes": recent_likes,
                        "readers": recent_readers,
                    },
                    "created_at": novel.created_at.isoformat() if novel.created_at else None,
                    "cover_image_url": novel.cover_image_url,
                })
        
        # Sort by trending score
        trending.sort(key=lambda x: x["trending_score"], reverse=True)
        
        return trending[:limit]

    @staticmethod
    def get_rising_stars(
        db: Session,
        limit: int = 20,
        days: int = 30,
    ) -> List[Dict]:
        """
        Get rising star novels - newer novels gaining traction quickly.
        Focuses on novels published recently with high engagement rate.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get novels published in the time period
        novels = (
            db.query(Novel)
            .filter(
                Novel.is_published == True,
                Novel.created_at >= cutoff_date
            )
            .order_by(desc(Novel.created_at))
            .all()
        )
        
        rising = []
        for novel in novels:
            # Calculate days since publication
            days_since_pub = max(1, (datetime.utcnow() - novel.created_at).days)
            
            # Get total engagement
            total_reviews = db.query(func.count(NovelReview.id)).filter(
                NovelReview.novel_id == novel.id
            ).scalar() or 0
            
            total_likes = db.query(func.count(Like.id)).filter(
                Like.target_type == 'novel',
                Like.target_id == novel.id
            ).scalar() or 0
            
            total_readers = db.query(func.count(ReadingProgress.user_id)).filter(
                ReadingProgress.novel_id == novel.id
            ).distinct().scalar() or 0
            
            # Calculate engagement rate (per day)
            engagement_rate = (total_reviews + total_likes + total_readers) / days_since_pub
            
            # Get quality score
            quality_data = QualityContentService.calculate_quality_score(novel, db)
            
            # Combined score: 60% quality, 40% growth rate
            combined_score = (quality_data["overall_score"] * 0.6) + (min(100, engagement_rate * 10) * 0.4)
            
            rising.append({
                "id": novel.id,
                "title": novel.title,
                "genre": novel.genre,
                "author": novel.author.username if novel.author else None,
                "days_since_publication": days_since_pub,
                "engagement_rate": round(engagement_rate, 2),
                "quality_score": quality_data["overall_score"],
                "combined_score": round(combined_score, 2),
                "total_engagement": total_reviews + total_likes + total_readers,
                "created_at": novel.created_at.isoformat() if novel.created_at else None,
                "cover_image_url": novel.cover_image_url,
            })
        
        # Sort by combined score
        rising.sort(key=lambda x: x["combined_score"], reverse=True)
        
        return rising[:limit]

    @staticmethod
    def get_quality_by_genre(
        db: Session,
        genre: str,
        limit: int = 20,
    ) -> List[Dict]:
        """Get top quality novels in a specific genre."""
        return QualityContentService.get_editors_picks(
            db=db,
            limit=limit,
            genre=genre,
        )


quality_content_service = QualityContentService()
