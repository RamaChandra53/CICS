'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchFeedPostsPage,
  mergePosts,
  type FeedCommunity,
} from '@/lib/services/posts';
import type { PostWithAuthor } from '@/types/domain';

type ErrorContext = 'initial' | 'refresh' | 'loadMore' | null;

type FeedCacheEntry = {
  posts: PostWithAuthor[];
  hasMore: boolean;
  page: number;
  lastFetchedAt: number;
};

const feedCache: Record<string, FeedCacheEntry> = {};

const PAGE_SIZE = 15;
const REQUEST_TIMEOUT_MS = 10_000;

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    if (meta) {
      console.debug(`[feed] ${message}`, meta);
    } else {
      console.debug(`[feed] ${message}`);
    }
  }
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export default function useFeedPosts(selectedCommunity: FeedCommunity) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorContext, setErrorContext] = useState<ErrorContext>(null);

  const latestRequestId = useRef(0);
  const activeCommunityRef = useRef<FeedCommunity>(selectedCommunity);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Refs for loading guards — lets callbacks stay stable without depending on state
  const isRefreshingRef = useRef(false);
  const isInitialLoadingRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const updatePostOptimistically = useCallback(
    (postId: string, update: Partial<PostWithAuthor> | ((post: PostWithAuthor) => PostWithAuthor)) => {
      const applyUpdate = (post: PostWithAuthor) =>
        typeof update === 'function' ? update(post) : { ...post, ...update };

      setPosts((prev) => prev.map((post) => (post.id === postId ? applyUpdate(post) : post)));

      Object.keys(feedCache).forEach((key) => {
        const entry = feedCache[key];
        if (!entry) return;
        entry.posts = entry.posts.map((post) => (post.id === postId ? applyUpdate(post) : post));
      });
    },
    []
  );

  const applyCache = useCallback(
    (community: FeedCommunity) => {
      const cacheEntry = feedCache[community];
      if (!cacheEntry) {
        logDebug('cache miss', { community });
        return null;
      }
      logDebug('cache hit', { community });
      setPosts(cacheEntry.posts);
      setHasMore(cacheEntry.hasMore);
      return cacheEntry;
    },
    []
  );

  const fetchPostsPage = useCallback(
    async (community: FeedCommunity, pageToLoad: number, mode: Exclude<ErrorContext, null>) => {
      const requestId = ++latestRequestId.current;
      activeCommunityRef.current = community;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const cacheKey = community;
      const isInitial = mode === 'initial';
      const isRefresh = mode === 'refresh';
      const isLoadMore = mode === 'loadMore';

      if (isInitial) {
        setIsInitialLoading(true);
        isInitialLoadingRef.current = true;
      }
      if (isRefresh) {
        setIsRefreshing(true);
        isRefreshingRef.current = true;
      }
      if (isLoadMore) {
        setIsLoadingMore(true);
        isLoadingMoreRef.current = true;
      }

      setError(null);
      setErrorContext(null);

      logDebug('fetch started', { community, page: pageToLoad, mode, requestId });

      const isCurrent = () =>
        mountedRef.current &&
        requestId === latestRequestId.current &&
        activeCommunityRef.current === community;

      try {
        const normalized = await withTimeout(
          fetchFeedPostsPage(supabase, {
            community,
            page: pageToLoad,
            pageSize: PAGE_SIZE,
            userId,
            signal: abortController.signal,
          }),
          REQUEST_TIMEOUT_MS,
          'Request timed out. Please try again.'
        );

        if (!isCurrent()) {
          logDebug('stale response ignored', { community, page: pageToLoad, mode, requestId });
          return;
        }

        const existingPosts = isLoadMore ? feedCache[cacheKey]?.posts ?? [] : [];
        const merged = isLoadMore ? mergePosts(existingPosts, normalized) : normalized;
        const hasNextPage = normalized.length === PAGE_SIZE;

        feedCache[cacheKey] = {
          posts: merged,
          hasMore: hasNextPage,
          page: isLoadMore ? pageToLoad : 0,
          lastFetchedAt: Date.now(),
        };

        setPosts(merged);
        setHasMore(hasNextPage);
        hasMoreRef.current = hasNextPage;
        setError(null);
        setErrorContext(null);

        logDebug('fetch finished', { community, page: pageToLoad, mode, count: normalized.length });
      } catch (err: unknown) {
        if (!isCurrent()) {
          logDebug('stale error ignored', { community, page: pageToLoad, mode, requestId });
          return;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          logDebug('request aborted', { community, page: pageToLoad, mode });
          return;
        }

        const message =
          err instanceof Error && err.message ? err.message : 'Failed to load posts.';
        setError(message);
        setErrorContext(mode);
        logDebug('fetch error', { community, page: pageToLoad, mode, message });
      } finally {
        if (!isCurrent()) {
          return;
        }
        setIsInitialLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        isInitialLoadingRef.current = false;
        isRefreshingRef.current = false;
        isLoadingMoreRef.current = false;
      }
    },
    [supabase, userId]
  );

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current || isInitialLoadingRef.current) return;
    await fetchPostsPage(selectedCommunity, 0, 'refresh');
  }, [fetchPostsPage, selectedCommunity]);

  const retry = useCallback(async () => {
    const mode: Exclude<ErrorContext, null> = posts.length > 0 ? 'refresh' : 'initial';
    await fetchPostsPage(selectedCommunity, 0, mode);
  }, [fetchPostsPage, posts.length, selectedCommunity]);

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || isRefreshingRef.current || isInitialLoadingRef.current || !hasMoreRef.current) return;
    const cacheEntry = feedCache[selectedCommunity];
    const nextPage = (cacheEntry?.page ?? 0) + 1;
    await fetchPostsPage(selectedCommunity, nextPage, 'loadMore');
  }, [fetchPostsPage, selectedCommunity]);

  useEffect(() => {
    if (authLoading) return;

    const cacheEntry = applyCache(selectedCommunity);
    const hasCache = !!cacheEntry;

    setError(null);
    setErrorContext(null);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;

    if (!hasCache) {
      setPosts([]);
      setHasMore(true);
      hasMoreRef.current = true;
      setIsInitialLoading(true);
      isInitialLoadingRef.current = true;
    }

    // Cached posts remain unchanged until the user explicitly refreshes,
    // changes community, or performs an action such as creating a post.
    // In particular, do not refetch after Supabase renews an auth session.
    if (!hasCache) {
      fetchPostsPage(selectedCommunity, 0, 'initial');
    } else {
      setIsInitialLoading(false);
      isInitialLoadingRef.current = false;
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [selectedCommunity, applyCache, fetchPostsPage, authLoading]);

  return {
    posts,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error,
    errorContext,
    hasMore,
    refresh,
    loadMore,
    retry,
    updatePostOptimistically,
  };
}
