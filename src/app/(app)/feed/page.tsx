'use client';



import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Community } from '@/types';
import PostCard from '@/components/PostCard';
import EnhancedCreatePostForm from '@/components/EnhancedCreatePostForm';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundaryFunctional from '@/components/ErrorBoundaryFunctional';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [composeSignal, setComposeSignal] = useState(0);

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

  const {
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
    selectedCommunity,
    setSelectedCommunity,
  } = useFeedPosts('all');

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

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/');
      return;
    }

    fetchCommunities();
  }, [authLoading, user, router, fetchCommunities]);

  if (authLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <SkeletonFeed count={5} />
      </div>
    );
  }

  return (
    <ErrorBoundaryFunctional>
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* Community Chips */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {communityChips.map((chip) => {
              const isActive = selectedCommunity === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCommunity(chip.id)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    isActive
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

        {/* Create Post Box */}
        {authProfile && (
          <div id="create-post" className="mb-4">
              <EnhancedCreatePostForm
                profile={authProfile}
                defaultCommunity="campus"
                openSignal={composeSignal}
                onPostCreated={() => {
                  refresh();
                }}
              />
          </div>
        )}

        {/* Posts */}
        {error && posts.length === 0 ? (
          <ErrorMessage
            title="Couldn’t load posts."
            message="Couldn’t load posts."
            onRetry={retry}
            retryText="Try again"
          />
        ) : isInitialLoading && posts.length === 0 ? (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">Loading posts...</div>
            <PostLoadingSkeleton count={3} />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No posts here yet."
            description="Start the first discussion."
            icon={
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            }
            action={{
              label: 'Create a post',
              onClick: openComposer,
            }}
          />
        ) : (
          <div className="space-y-3">
            {error && errorContext === 'refresh' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
                Couldn’t refresh. Showing saved posts.
              </div>
            )}

            {isRefreshing && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200">
                Refreshing feed...
              </div>
            )}

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
            
            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="h-11 rounded-full border border-indigo-500/30 px-6 text-sm font-medium text-indigo-300 transition-colors hover:border-indigo-400/60 hover:text-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Posts'}
                </button>
              </div>
            )}

            {error && errorContext === 'loadMore' && (
              <div className="text-center text-xs text-amber-200">
                Couldn’t load more posts. Try again in a moment.
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundaryFunctional>
  );
}
