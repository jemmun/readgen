import time
from typing import Any, Optional, Dict
from functools import wraps


class CacheManager:
    """Simple in-memory cache with TTL support."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if it exists and hasn't expired."""
        if key not in self._cache:
            return None
        
        cache_entry = self._cache[key]
        if cache_entry['expires_at'] < time.time():
            # Cache expired
            del self._cache[key]
            return None
        
        return cache_entry['value']
    
    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set value in cache with TTL (in seconds)."""
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
        }
    
    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self, pattern: Optional[str] = None) -> int:
        """Clear cache, optionally by pattern prefix."""
        if pattern:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
        else:
            count = len(self._cache)
            self._cache.clear()
            return count
    
    def cleanup(self) -> int:
        """Remove all expired entries."""
        now = time.time()
        expired_keys = [
            k for k, v in self._cache.items() 
            if v['expires_at'] < now
        ]
        for key in expired_keys:
            del self._cache[key]
        return len(expired_keys)
    
    def cached(self, ttl: int = 300, key_prefix: str = ""):
        """Decorator for caching function results."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Create cache key from function name and arguments
                cache_key = f"{key_prefix}{func.__name__}:{str(args)}:{str(kwargs)}"
                
                # Try to get from cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Call function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                return result
            return wrapper
        return decorator


# Global cache instance
cache_manager = CacheManager()


# Common cache TTL constants
CACHE_TTL = {
    'novels_list': 300,        # 5 minutes for novel lists
    'novel_detail': 600,       # 10 minutes for novel details
    'chapters': 900,           # 15 minutes for chapters
    'user_profile': 300,       # 5 minutes for user profiles
    'rankings': 600,           # 10 minutes for rankings
    'recommendations': 1800,   # 30 minutes for recommendations
    'tags': 3600,              # 1 hour for tags
    'genres': 3600,            # 1 hour for genres
    'stats': 300,              # 5 minutes for statistics
}
