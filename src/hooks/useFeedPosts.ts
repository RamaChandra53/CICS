'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Post } from '@/types';

const PAGE_SIZE = 15;

type VoteType = 'up' | 'down';

/**
 * Maps each community chip ID to the database room values to query.
 * 'all' fetches from all known feed rooms.
 * Specific communities filter to their matching room value.
 */
const ALL_FEED_ROOMS = ['campus', 'college', 'confessions', 'rants', 'random', 'placements'];

const COMMUNITY_FILTERS: Record<string, string[] | null> = {
  all: null, // null means use ALL_FEED_ROOMS
  general: ['campus', 'college'],
  confessions: ['confessions'],
  rants: ['rants'],
  random: ['random'],
  placements: ['placements'],
};

interface UseFeedPostsReturn {
  posts: Post[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string;
  selectedCommunity: string;
  setSelectedCommunity: (community: string) => void;
  refresh: () => void;
  retry: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useFeedPosts(userId: string | null | undefined): UseFeedPostsReturn {
  const supabase = useMemo(() => createClient(), []);

  const [selectedCommunity, setSelectedCommunityRaw] = useState('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Per-community cache
  const cacheRef = useRef<Map<string, Post[]>>(new Map());
  // Stale request guard
  const requestIdRef = useRef(0);

  const fetchPosts = useCallback(
    async (community: string, pageToLoad: number, options?: { reset?: boolean }) => {
      const currentRequestId = ++requestIdRef.current;
      const targetPage = options?.reset ? 0 : pageToLoad;

      if (process.env.NODE_ENV === 'development') {
        console.log('[feed] loading community:', community, 'page:', targetPage);
      }

      // Determine loading state
      const cached = cacheRef.current.get(community);
      if (targetPage === 0) {
        if (cached && cached.length > 0) {
          // Show cached posts immediately, refresh in background
          setPosts(cached);
          setIsRefreshing(true);
          setIsInitialLoading(false);
        } else {
          setIsInitialLoading(true);
        }
      } else {
        setIsLoadingMore(true);
      }

      setError('');

      try {
        const rooms = COMMUNITY_FILTERS[community] ?? ALL_FEED_ROOMS;

        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(
            'id, author_id, room, content, image_url, is_anon_post, display_mode, year_tag, branch_tag, section_tag, created_at, upvotes, downvotes, profiles (id, username, full_name, is_verified, is_email_verified, year, branch, pseudo_username, real_display_name), comment_count:comments(count)'
          )
          .in('room', rooms)
          .order('created_at', { ascending: false })
          .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);

        // Guard: ignore stale responses
        if (currentRequestId !== requestIdRef.current) return;

        if (fetchError) {
          console.error('Error fetching feed posts:', fetchError);
          setError(fetchError.message || 'Failed to fetch posts');
          return;
        }

        const postsData =
          (data as Array<Post & { comment_count?: Array<{ count: number }> }>) ?? [];

        // Render posts IMMEDIATELY — don't wait for votes
        const normalized = postsData.map((post) => ({
          ...post,
          profiles: post.profiles ?? null,
          comment_count: post.comment_count?.[0]?.count ?? 0,
          user_vote: null as 'up' | 'down' | null,
        }));

        if (options?.reset || targetPage === 0) {
          setPosts(normalized);
          cacheRef.current.set(community, normalized);
          setPage(0);
        } else {
          setPosts((prev) => {
            const merged = [...prev, ...normalized];
            cacheRef.current.set(community, merged);
            return merged;
          });
        }

        setHasMore(postsData.length === PAGE_SIZE);

        if (process.env.NODE_ENV === 'development') {
          console.log('[feed] loaded posts:', normalized.length, 'for:', community);
        }

        // Fetch votes in background (non-blocking) — posts are already visible
        const postIds = postsData.map((post) => post.id);
        if (userId && postIds.length > 0) {
          supabase
            .from('post_votes')
            .select('post_id, vote_type')
            .eq('user_id', userId)
            .in('post_id', postIds)
            .then(({ data: votes, error: votesError }: { data: Array<{ post_id: string; vote_type: VoteType }> | null; error: { message: string } | null }) => {
              if (currentRequestId !== requestIdRef.current) return;
              if (votesError) {
                console.error('Error fetching post votes:', votesError);
                return;
              }

              const votesData = (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
              if (votesData.length === 0) return;

              const voteMap = new Map(votesData.map((v) => [v.post_id, v.vote_type]));

              // Merge votes into visible posts
              setPosts((prev) => {
                const updated = prev.map((post) => ({
                  ...post,
                  user_vote: voteMap.get(post.id) ?? post.user_vote,
                }));
                cacheRef.current.set(community, updated);
                return updated;
              });
            });
        }
      } catch (err) {
        // Guard staleness
        if (currentRequestId !== requestIdRef.current) return;

        console.error('Unexpected error fetching feed posts:', err);
        setError(
          err instanceof Error ? err.message : 'Something went wrong while fetching posts'
        );
      } finally {
        // Guard staleness for state cleanup
        if (currentRequestId === requestIdRef.current) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [supabase, userId]
  );

  const setSelectedCommunity = useCallback(
    (community: string) => {
      setSelectedCommunityRaw(community);
      setPage(0);
      setHasMore(true);
      fetchPosts(community, 0, { reset: true });
    },
    [fetchPosts]
  );

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchPosts(selectedCommunity, 0, { reset: true });
  }, [selectedCommunity, fetchPosts]);

  const retry = useCallback(() => {
    setError('');
    setPage(0);
    setHasMore(true);
    fetchPosts(selectedCommunity, 0, { reset: true });
  }, [selectedCommunity, fetchPosts]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isRefreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(selectedCommunity, nextPage);
    }
  }, [page, isLoadingMore, isRefreshing, hasMore, selectedCommunity, fetchPosts]);

  return {
    posts,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error,
    selectedCommunity,
    setSelectedCommunity,
    refresh,
    retry,
    loadMore,
    hasMore,
  };
}
