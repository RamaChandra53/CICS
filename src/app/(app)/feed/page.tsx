'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Community } from '@/types';
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

const FALLBACK_COMMUNITY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'campus', label: 'Campus' },
  { id: 'confessions', label: 'Confessions' },
  { id: 'placements', label: 'Placements' },
  { id: 'clubs', label: 'Clubs' },
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

  const [communities, setCommunities] = useState<Community[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const [selectedCommunity, setSelectedCommunity] = useState('all');
  const [composeSignal, setComposeSignal] = useState(0);

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

  // Fetch communities list (for chip label enrichment)
  const fetchCommunities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, slug, description, icon, type, member_count, created_at')
        .order('member_count', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching communities:', error);
        return;
      }

      setCommunities(data || []);
    } catch (error) {
      console.error('Unexpected error fetching communities:', error);
    }
  }, [supabase]);

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
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-5 md:py-8 overflow-x-hidden">
        <section className="mb-5 rounded-3xl border border-white/8 bg-gradient-to-br from-indigo-500/15 via-[#151b2b] to-[#111722] px-5 py-5 shadow-xl shadow-black/10 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Your campus space</p>
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">Good to see you{authProfile?.username ? `, ${authProfile.username}` : ''}.</h1>
              <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-400">Catch up on campus conversations or start one of your own.</p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={isRefreshing}
              aria-label="Refresh feed"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2M20 20h-5" />
              </svg>
            </button>
          </div>
          <button type="button" onClick={openComposer} className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-slate-500 transition hover:border-indigo-400/30 hover:bg-white/5 hover:text-slate-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-400/15 text-lg leading-none text-indigo-200">+</span>
            Share something with your campus…
          </button>
        </section>

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

        {/* Refreshing indicator */}
        {isRefreshing && (
          <div className="mb-3 flex items-center justify-center gap-2 py-1.5">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="text-xs text-slate-400">Refreshing...</span>
          </div>
        )}

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
