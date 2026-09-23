'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { CommunitySummary } from '@/types/domain';
import PostCard from '@/components/PostCard';
import EnhancedCreatePostForm from '@/components/EnhancedCreatePostForm';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import SkeletonFeed from '@/components/ui/SkeletonFeed';
import useFeedPosts from '@/hooks/useFeedPosts';
import { fetchUserCommunities, isClubCommunity } from '@/lib/services/communities';

const FALLBACK_COMMUNITY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'campus', label: 'Campus' },
  { id: 'confessions', label: 'Confessions' },
  { id: 'placements', label: 'Placements' },
  { id: 'alumni', label: 'Alumni' },
];

export default function FeedPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const {
    user,
    profile: authProfile,
    loading: authLoading,
    profileLoading,
  } = useAuth();

  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const [selectedCommunity, setSelectedCommunity] = useState('all');
  const [composeSignal, setComposeSignal] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const {
    posts,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    error: postsError,
    refresh,
    retry,
    loadMore,
    hasMore,
    updatePostOptimistically,
  } = useFeedPosts(selectedCommunity);

  const communityChips = useMemo(() => {
    if (communities.length === 0) return FALLBACK_COMMUNITY_CHIPS;
    return [
      { id: 'all', label: 'All' },
      ...communities.map((c) => ({ id: c.slug, label: c.name })),
    ];
  }, [communities]);

  const composeParam = searchParams.get('compose');

  const openComposer = useCallback(() => {
    setComposeSignal((prev) => prev + 1);
    const target = document.getElementById('create-post');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (composeParam !== '1') return;
    openComposer();
  }, [composeParam, openComposer]);

  useEffect(() => {
    const handleOpen = () => openComposer();
    window.addEventListener('open-create-post', handleOpen);
    return () => window.removeEventListener('open-create-post', handleOpen);
  }, [openComposer]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 0 || isRefreshing || isInitialLoading) return;
    pullStartY.current = event.touches[0]?.clientY ?? null;
    isPulling.current = true;
  }, [isInitialLoading, isRefreshing]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling.current || pullStartY.current === null) return;
    if (window.scrollY > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartY.current;
    const distance = Math.max(0, currentY - pullStartY.current);
    setPullDistance(Math.min(96, distance * 0.55));
  }, []);

  const handleTouchEnd = useCallback(() => {
    const shouldRefresh = pullDistance >= 56 && !isRefreshing && !isInitialLoading;
    pullStartY.current = null;
    isPulling.current = false;
    setPullDistance(0);

    if (shouldRefresh) {
      void refresh();
    }
  }, [isInitialLoading, isRefreshing, pullDistance, refresh]);

  // Fetch communities list (for chip label enrichment)
  const fetchCommunities = useCallback(async () => {
    try {
      if (!user?.id) return;
      const memberships = await fetchUserCommunities(supabase, user.id);
      setCommunities(memberships.filter((community) => !isClubCommunity(community)).slice(0, 30));
    } catch (error) {
      console.error('Unexpected error fetching communities:', error);
    }
  }, [supabase, user?.id]);

  // Initialize: auth check + fetch communities
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) return;

    setAuthReady(true);
    fetchCommunities();
    // Initial feed load is automatically handled by the useFeedPosts hook
  }, [authLoading, profileLoading, user, fetchCommunities]);

  if (authLoading || (!authReady && !postsError)) {
    return (
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <SkeletonFeed count={5} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6 overflow-x-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="flex items-center justify-center overflow-hidden text-xs text-slate-500 transition-[height,opacity] duration-150"
          style={{ height: isRefreshing ? 34 : pullDistance, opacity: isRefreshing || pullDistance > 8 ? 1 : 0 }}
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-3.5 w-3.5 rounded-full border-2 border-indigo-500 border-t-transparent ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={!isRefreshing ? { transform: `rotate(${pullDistance * 4}deg)` } : undefined}
            />
            <span>{isRefreshing ? 'Refreshing...' : pullDistance >= 56 ? 'Release to refresh' : 'Pull to refresh'}</span>
          </div>
        </div>

        {/* Community Chips */}
        <div className="mb-5 overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div className="flex gap-2 pb-1">
            {communityChips.map((chip) => {
              const isActive = selectedCommunity === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCommunity(chip.id)}
                  aria-pressed={isActive}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all ${isActive
                      ? 'border-indigo-400/30 bg-indigo-400/15 text-indigo-100 shadow-sm shadow-indigo-950/30'
                      : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-slate-200'
                    }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create Post Box */}
        {authProfile && (
          <div id="create-post" className="mb-5 scroll-mt-5">
            <EnhancedCreatePostForm
              profile={authProfile}
              defaultCommunity="campus"
              openSignal={composeSignal}
            />
          </div>
        )}

        {/* Posts */}
        {postsError ? (
          <ErrorMessage
            title="Couldn't load posts"
            message={postsError}
            onRetry={retry}
            retryText="Try again"
          />
        ) : isInitialLoading ? (
          <PostLoadingSkeleton count={3} />
        ) : posts.length === 0 ? (
          <EmptyState
            title="No posts here yet"
            description="Start the first discussion."
            icon={
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            }
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id}>
                <PostCard
                  post={post}
                  currentUserId={user?.id ?? null}
                  initialUserVote={post.user_vote ?? null}
                  onPostUpdate={updatePostOptimistically}
                />
              </div>
            ))}

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <span className="text-sm text-slate-400">Loading more...</span>
                </div>
              </div>
            )}

            {/* Load More Button */}
            {hasMore && !isLoadingMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  className="h-11 rounded-full border border-indigo-500/30 px-6 text-sm font-medium text-indigo-300 transition-colors hover:border-indigo-400/60 hover:text-indigo-200"
                >
                  Load More Posts
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
