import { useState, useCallback, useEffect } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number, pageSize: number) => Promise<T[]>;
  pageSize?: number;
  enabled?: boolean;
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  loadMore: () => void;
  refresh: () => Promise<void>;
  error: string | null;
}

export function useInfiniteScroll<T>(
  options: UseInfiniteScrollOptions<T>
): UseInfiniteScrollResult<T> {
  const { fetchData, pageSize = 20, enabled = true } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (pageNum: number, append = false) => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchData(pageNum, pageSize);
      
      if (append) {
        setItems(prev => [...prev, ...data]);
      } else {
        setItems(data);
      }
      
      // If we got less than pageSize, we've reached the end
      setHasMore(data.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Infinite scroll error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchData, pageSize, enabled]);

  // Load first page
  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPage(nextPage, true);
    }
  }, [loading, hasMore, page, loadPage]);

  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await loadPage(1, false);
  }, [loadPage]);

  return {
    items,
    loading,
    hasMore,
    page,
    loadMore,
    refresh,
    error,
  };
}
