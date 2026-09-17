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

const BASE_COMMUNITY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'confessions', label: 'Confessions' },
  { id: 'rants', label: 'Rants' },
  { id: 'random', label: 'Random' },
  { id: 'placements', label: 'Placements' },
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
    if (communities.length === 0) return BASE_COMMUNITY_CHIPS;
    const labelMap = new Map(communities.map((community) => [community.slug, community.name]));
    const hasMatchingChip = BASE_COMMUNITY_CHIPS.some((chip) => labelMap.has(chip.id));
    if (!hasMatchingChip) return BASE_COMMUNITY_CHIPS;
    return BASE_COMMUNITY_CHIPS.map((chip) => ({
      ...chip,
      label: labelMap.get(chip.id) ?? chip.label,
    }));
  }, [communities]);

  const composeParam = searchParams.get('compose');

  useEffect(() => {
    if (composeParam !== '1') return;
    const target = document.getElementById('create-post');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [composeParam]);

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
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6 overflow-x-hidden">
        {/* Community Chips */}
        <div className="mb-4 overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div className="flex gap-2 pb-1">
            {communityChips.map((chip) => {
              const isActive = selectedCommunity === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCommunity(chip.id)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors ${isActive
                      ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-200'
                      : 'border-[#252a31] bg-[#15181c] text-slate-400'
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
          <div id="create-post" className="mb-4">
            <EnhancedCreatePostForm
              profile={authProfile}
              defaultCommunity="campus"
              onPostCreated={() => {
                refresh();
              }}
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
