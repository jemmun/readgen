from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.security import get_current_user_required
from app.utils.cache import cache_manager, CACHE_TTL

router = APIRouter(prefix="/cache", tags=["cache"])


@router.delete("/clear")
def clear_cache(
    pattern: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Clear cache (admin only - for now any authenticated user)."""
    # In production, this should be admin-only
    count = cache_manager.clear(pattern)
    return {
        "message": f"Cleared {count} cache entries",
        "pattern": pattern,
    }


@router.get("/stats")
def get_cache_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Get cache statistics."""
    return {
        "total_entries": len(cache_manager._cache),
        "ttl_config": CACHE_TTL,
    }


@router.post("/cleanup")
def cleanup_expired_cache(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Remove expired cache entries."""
    count = cache_manager.cleanup()
    return {
        "message": f"Removed {count} expired cache entries",
    }
