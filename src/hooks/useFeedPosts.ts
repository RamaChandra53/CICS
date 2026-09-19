'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export type FeedCommunity =
  | 'all'
  | 'campus'
  | 'confessions'
  | 'placements'
  | 'clubs'
  | 'alumni'
  | string;

type VoteType = 'up' | 'down';
type ErrorContext = 'initial' | 'refresh' | 'loadMore' | null;

type FeedCacheEntry = {
  posts: Post[];
  hasMore: boolean;
  page: number;
  lastFetchedAt: number;
};

const feedCache: Record<string, FeedCacheEntry> = {};

const PAGE_SIZE = 15;
const CACHE_TTL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 10_000;

const COMMUNITY_ROOM_MAP: Record<string, string[] | null> = {
  all: null,
  campus: ['campus'],
  confessions: ['confessions'],
  placements: ['placements'],
  clubs: ['clubs'],
  alumni: ['alumni'],
};

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

const applyAbortSignal = <T,>(query: T, signal: AbortSignal) => {
  const abortable = query as { abortSignal?: (signal: AbortSignal) => unknown };
  if (typeof abortable.abortSignal === 'function') {
    abortable.abortSignal(signal);
  }
  return query;
};

const mergePosts = (existing: Post[], incoming: Post[]) => {
  const seen = new Set(existing.map((post) => post.id));
  const merged = [...existing];
  for (const post of incoming) {
    if (!seen.has(post.id)) {
      merged.push(post);
      seen.add(post.id);
    }
  }
  return merged;
};

const getRoomFilters = (community: string) => {
  if (community in COMMUNITY_ROOM_MAP) {
    return COMMUNITY_ROOM_MAP[community];
  }
  return [community];
};

export default function useFeedPosts(selectedCommunity: FeedCommunity) {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [posts, setPosts] = useState<Post[]>([]);
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
  const lastUserIdRef = useRef<string | null>(userId);

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
    (postId: string, update: Partial<Post> | ((post: Post) => Post)) => {
      const applyUpdate = (post: Post) =>
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
        const roomFilters = getRoomFilters(community);

        // Fetch posts with profiles and comment counts in one query to avoid N+1 requests.
        let query = supabase
          .from('posts')
          .select(
            'id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, poll_options, poll_expires_at, is_anon_post, display_mode, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name), comment_count:comments(count)'
          )
          .eq('is_draft', false)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(pageToLoad * PAGE_SIZE, pageToLoad * PAGE_SIZE + PAGE_SIZE - 1);

        if (roomFilters && roomFilters.length > 0) {
          query = roomFilters.length === 1 ? query.eq('room', roomFilters[0]) : query.in('room', roomFilters);
        }

        applyAbortSignal(query, abortController.signal);

        const { data, error: queryError } = await withTimeout(
          Promise.resolve(query),
          REQUEST_TIMEOUT_MS,
          'Request timed out. Please try again.'
        );

        if (queryError) throw queryError;

        const rawPosts =
          (data as Array<Post & { comment_count?: { count: number }[] }> | null) ?? [];

        const postsData = rawPosts.map((post) => ({
          ...post,
          profiles: post.profiles ?? null,
          comment_count: Array.isArray(post.comment_count)
            ? post.comment_count?.[0]?.count ?? 0
            : post.comment_count ?? 0,
        }));

        let voteMap = new Map<string, VoteType>();
        const postIds = postsData.map((post) => post.id);

        // Batch fetch the current user's votes for the visible posts.
        if (userId && postIds.length > 0) {
          const voteQuery = supabase
            .from('post_votes')
            .select('post_id, vote_type')
            .eq('user_id', userId)
            .in('post_id', postIds);

          applyAbortSignal(voteQuery, abortController.signal);

          const { data: votes, error: votesError } = await withTimeout(
            Promise.resolve(voteQuery),
            REQUEST_TIMEOUT_MS,
            'Request timed out. Please try again.'
          );

          if (votesError) {
            logDebug('vote fetch error', { error: votesError.message });
          } else {
            const votesData = (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
            voteMap = new Map(votesData.map((vote) => [vote.post_id, vote.vote_type]));
          }
        }

        const normalized = postsData.map((post) => ({
          ...post,
          user_vote: voteMap.get(post.id) ?? null,
        }));

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

  // Keep a stable ref for refresh so the userId-change effect doesn't depend on it
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

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

    const isStale = !cacheEntry || Date.now() - cacheEntry.lastFetchedAt > CACHE_TTL_MS;

    if (isStale) {
      if (hasCache) {
        setIsRefreshing(true);
        isRefreshingRef.current = true;
      }
      fetchPostsPage(selectedCommunity, 0, hasCache ? 'refresh' : 'initial');
    } else {
      setIsInitialLoading(false);
      isInitialLoadingRef.current = false;
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [selectedCommunity, applyCache, fetchPostsPage, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (lastUserIdRef.current !== userId) {
      lastUserIdRef.current = userId;
      if (posts.length > 0) {
        refreshRef.current();
      }
    }
  }, [authLoading, userId, posts.length]);

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
