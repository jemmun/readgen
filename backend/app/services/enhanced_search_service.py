from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from app.models.novel import Novel
from app.models.chapter import Chapter
import re


class EnhancedSearchService:
    """Enhanced search with filters, suggestions, and full-text search."""

    async def search_novels(
        self,
        db: Session,
        query: str,
        filters: Optional[Dict] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict:
        """
        Advanced search with multiple filters.
        
        Filters can include:
        - genre: str
        - style: str
        - tone: str
        - target_audience: str
        - status: str
        - is_completed: bool
        - min_word_count: int
        - max_word_count: int
        """
        filters = filters or {}
        
        # Build search query
        search_query = db.query(Novel).filter(Novel.is_published == True)
        
        # Text search in multiple fields
        if query:
            q = f"%{query}%"
            search_query = search_query.filter(
                or_(
                    Novel.title.ilike(q),
                    Novel.theme_description.ilike(q),
                    Novel.genre.ilike(q),
                    Novel.style.ilike(q),
                )
            )
        
        # Apply filters
        if filters.get('genre'):
            search_query = search_query.filter(Novel.genre == filters['genre'])
        if filters.get('style'):
            search_query = search_query.filter(Novel.style == filters['style'])
        if filters.get('tone'):
            search_query = search_query.filter(Novel.tone == filters['tone'])
        if filters.get('target_audience'):
            search_query = search_query.filter(Novel.target_audience == filters['target_audience'])
        if filters.get('status'):
            search_query = search_query.filter(Novel.status == filters['status'])
        if filters.get('is_completed') is not None:
            if filters['is_completed']:
                search_query = search_query.filter(Novel.status == 'completed')
            else:
                search_query = search_query.filter(Novel.status != 'completed')
        if filters.get('min_word_count'):
            search_query = search_query.filter(Novel.total_word_count >= filters['min_word_count'])
        if filters.get('max_word_count'):
            search_query = search_query.filter(Novel.total_word_count <= filters['max_word_count'])
        
        # Get total count
        total = search_query.count()
        
        # Get paginated results
        skip = (page - 1) * page_size
        novels = search_query.order_by(desc(Novel.created_at)).offset(skip).limit(page_size).all()
        
        # Enrich results
        results = []
        for novel in novels:
            results.append({
                "id": novel.id,
                "title": novel.title,
                "genre": novel.genre,
                "style": novel.style,
                "tone": novel.tone,
                "target_audience": novel.target_audience,
                "total_word_count": novel.total_word_count,
                "status": novel.status,
                "created_at": novel.created_at.isoformat() if novel.created_at else None,
                "author": novel.author.username if novel.author else None,
                "cover_image_url": novel.cover_image_url,
            })
        
        return {
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
            "has_next": page * page_size < total,
            "has_prev": page > 1,
        }

    async def get_search_suggestions(
        self,
        db: Session,
        partial_query: str,
        limit: int = 10,
    ) -> Dict:
        """Get autocomplete suggestions based on partial query."""
        if not partial_query or len(partial_query) < 2:
            return {"suggestions": []}
        
        q = f"%{partial_query}%"
        
        # Search for matching titles
        title_matches = (
            db.query(Novel.title)
            .filter(Novel.is_published == True, Novel.title.ilike(q))
            .distinct()
            .limit(limit)
            .all()
        )
        
        # Search for matching genres
        genre_matches = (
            db.query(Novel.genre)
            .filter(Novel.is_published == True, Novel.genre.ilike(q), Novel.genre.isnot(None))
            .distinct()
            .limit(limit)
            .all()
        )
        
        suggestions = []
        for title in title_matches:
            suggestions.append({
                "type": "title",
                "text": title[0],
            })
        
        for genre in genre_matches:
            suggestions.append({
                "type": "genre",
                "text": genre[0],
            })
        
        return {
            "suggestions": suggestions[:limit],
            "query": partial_query,
        }

    async def get_search_stats(
        self,
        db: Session,
    ) -> Dict:
        """Get search-related statistics for filter options."""
        # Get genre distribution
        genres = (
            db.query(Novel.genre, func.count(Novel.id))
            .filter(Novel.is_published == True, Novel.genre.isnot(None))
            .group_by(Novel.genre)
            .order_by(func.count(Novel.id).desc())
            .all()
        )
        
        # Get style distribution
        styles = (
            db.query(Novel.style, func.count(Novel.id))
            .filter(Novel.is_published == True, Novel.style.isnot(None))
            .group_by(Novel.style)
            .order_by(func.count(Novel.id).desc())
            .all()
        )
        
        # Get audience distribution
        audiences = (
            db.query(Novel.target_audience, func.count(Novel.id))
            .filter(Novel.is_published == True, Novel.target_audience.isnot(None))
            .group_by(Novel.target_audience)
            .order_by(func.count(Novel.id).desc())
            .all()
        )
        
        return {
            "genres": [{"name": g[0], "count": g[1]} for g in genres],
            "styles": [{"name": s[0], "count": s[1]} for s in styles],
            "target_audiences": [{"name": a[0], "count": a[1]} for a in audiences],
        }


enhanced_search_service = EnhancedSearchService()
