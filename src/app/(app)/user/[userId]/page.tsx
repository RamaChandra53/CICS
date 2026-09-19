'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post } from '@/types';
import PostCard from '@/components/PostCard';
import { useParams, useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import Link from 'next/link';

const PAGE_SIZE = 10;

type VoteType = 'up' | 'down';

type PublicProfile = {
  id: string;
  pseudo_username: string | null;
  is_verified: boolean;
  is_email_verified: boolean;
  year: string | null;
  branch: string | null;
  real_display_name: string | null;
  show_roll_number_publicly: boolean;
  created_at: string;
};

export default function UserProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // If viewing your own profile, redirect to /profile
  useEffect(() => {
    if (user?.id && userId && user.id === userId) {
      router.replace('/profile');
    }
  }, [user?.id, userId, router]);

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, pseudo_username, is_verified, is_email_verified, year, branch, real_display_name, show_roll_number_publicly, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching public profile:', error);
        setProfileError('Failed to load this profile.');
        return null;
      }

      if (!data) {
        setProfileError('User not found.');
        return null;
      }

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfileError('Something went wrong.');
      return null;
    }
  }, [supabase, userId]);

  const fetchUserPosts = useCallback(
    async (targetUserId: string, pageToLoad = 0, options?: { reset?: boolean }) => {
      try {
        setPostsLoading(true);
        setPostsError('');

        const targetPage = options?.reset ? 0 : pageToLoad;
        // Fetch only non-anonymous posts by this user
        const { data, error } = await supabase
          .from('posts')
          .select(
            'id, author_id, room, content, image_url, video_url, link_url, poll_options, poll_expires_at, post_type, is_anon_post, display_mode, created_at, upvotes, downvotes, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name), comment_count:comments(count)'
          )
          .eq('author_id', targetUserId)
          .eq('is_anon_post', false)
          .neq('display_mode', 'anonymous')
          .order('created_at', { ascending: false })
          .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching user posts:', error);
          setPostsError(error.message || 'Failed to fetch posts');
          return;
        }

        const postsData =
          (data as Array<Post & { comment_count: { count: number }[] }>) ?? [];
        const postIds = postsData.map((post) => post.id);
        let voteMap = new Map<string, VoteType>();

        // Fetch current viewer's votes
        if (user?.id && postIds.length > 0) {
          const { data: votes, error: votesError } = await supabase
            .from('post_votes')
            .select('post_id, vote_type')
            .eq('user_id', user.id)
            .in('post_id', postIds);

          if (!votesError && votes) {
            const votesData = (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
            voteMap = new Map(
              votesData.map((vote) => [vote.post_id, vote.vote_type])
            );
          }
        }

        const normalized = postsData.map((p) => ({
          ...p,
          comment_count: Array.isArray(p.comment_count)
            ? p.comment_count?.[0]?.count ?? 0
            : (p.comment_count as unknown as number) ?? 0,
          user_vote: voteMap.get(p.id) ?? null,
        }));

        if (options?.reset || targetPage === 0) {
          setPosts(normalized);
        } else {
          setPosts((prev) => [...prev, ...normalized]);
        }

        setHasMore(normalized.length === PAGE_SIZE);
      } catch (error) {
        console.error('Unexpected error fetching user posts:', error);
        setPostsError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setPostsLoading(false);
      }
    },
    [supabase, user?.id]
  );

  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      setLoading(true);
      const profileData = await fetchProfile();
      if (profileData) {
        await fetchUserPosts(userId, 0, { reset: true });
      }
      setLoading(false);
    };

    init();
  }, [userId, fetchProfile, fetchUserPosts]);

  const loadMore = useCallback(() => {
    if (!postsLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserPosts(userId, nextPage);
    }
  }, [postsLoading, hasMore, page, fetchUserPosts, userId]);

  // Format join date
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const displayName = profile?.pseudo_username || 'Campus Member';
  const isVerified = profile?.is_verified || profile?.is_email_verified;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile skeleton */}
        <div className="bg-[#15181c] border border-[#252a31] rounded-2xl p-6 mb-6 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1f2329]" />
            <div className="flex-1">
              <div className="h-6 w-40 bg-[#1f2329] rounded mb-2" />
              <div className="h-4 w-24 bg-[#1f2329] rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-[#1f2329] rounded-full" />
                <div className="h-6 w-16 bg-[#1f2329] rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <PostLoadingSkeleton count={2} />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ErrorMessage
          title="User not found"
          message={profileError || 'This user does not exist or their profile is private.'}
          onRetry={() => router.push('/feed')}
          retryText="Back to Feed"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Profile card */}
        <div className="bg-[#15181c] border border-[#252a31] rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-indigo-600/30 text-indigo-200">
              {displayName[0]?.toUpperCase() || '?'}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-white font-bold text-xl">{displayName}</h1>
                {isVerified && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    ✓ verified
                  </span>
                )}
              </div>

              {/* Real display name if set and different from pseudo */}
              {profile.real_display_name && profile.real_display_name !== displayName && (
                <p className="text-slate-400 text-sm mb-2">{profile.real_display_name}</p>
              )}

              {/* Year, Branch tags */}
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.year ? (
                  <span className="bg-[#1f2329] text-slate-400 text-xs px-2.5 py-1 rounded-full">
                    📅 {profile.year} Year
                  </span>
                ) : (
                  <span className="bg-purple-800/30 text-purple-400 text-xs px-2.5 py-1 rounded-full border border-purple-700/50">
                    🎓 Alumni
                  </span>
                )}
                {profile.branch && (
                  <span className="bg-[#1f2329] text-slate-400 text-xs px-2.5 py-1 rounded-full">
                    💻 {profile.branch}
                  </span>
                )}
              </div>

              {/* Join date & post count */}
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                {joinDate && (
                  <span>Joined {joinDate}</span>
                )}
                <span>{posts.length} public post{posts.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <h2 className="text-slate-400 text-sm font-medium mb-3">Posts</h2>
        {postsError ? (
          <ErrorMessage
            message={postsError}
            onRetry={() => fetchUserPosts(userId, 0, { reset: true })}
          />
        ) : postsLoading && posts.length === 0 ? (
          <PostLoadingSkeleton count={2} />
        ) : posts.length === 0 ? (
          <EmptyState
            title="No public posts"
            description="This user hasn't posted publicly yet, or their posts are all anonymous."
            icon={<div className="text-3xl">👻</div>}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                showRoom
                currentUserId={user?.id ?? null}
                initialUserVote={post.user_vote ?? null}
              />
            ))}

            {postsLoading && posts.length > 0 && (
              <div className="py-4 text-center text-xs text-slate-400">Loading more posts...</div>
            )}

            {hasMore && !postsLoading && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  className="rounded-lg border border-[#252a31] px-4 py-2 text-xs text-slate-300 transition-colors hover:border-indigo-400/60 hover:text-white"
                >
                  Load more posts
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
