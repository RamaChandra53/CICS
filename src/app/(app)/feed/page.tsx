'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile, Community } from '@/types';
import PostCard from '@/components/PostCard';
import EnhancedCreatePostForm from '@/components/EnhancedCreatePostForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RedditNavbar from '@/components/RedditNavbar';
import RedditSidebar from '@/components/RedditSidebar';
import RedditRightPanel from '@/components/RedditRightPanel';
import RedditMobileNav from '@/components/RedditMobileNav';
import ErrorBoundaryFunctional from '@/components/ErrorBoundaryFunctional';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import SkeletonFeed from '@/components/ui/SkeletonFeed';

const PAGE_SIZE = 15;

type VoteType = 'up' | 'down';

export default function FeedPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [postsError, setPostsError] = useState('');
  const [postsLoading, setPostsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);


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

  const fetchPosts = useCallback(
    async (pageToLoad = 0, options?: { reset?: boolean }) => {
      try {
        setPostsLoading(true);
        setPostsError('');

        const targetPage = options?.reset ? 0 : pageToLoad;
        const roomFilter = ['campus', 'college'];

        const { data, error } = await supabase
          .from('posts')
          .select(
            'id, author_id, room, content, image_url, is_anon_post, display_mode, year_tag, branch_tag, section_tag, created_at, upvotes, downvotes'
          )
          .in('room', roomFilter)
          .order('created_at', { ascending: false })
          .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching feed posts:', error);
          setPostsError(error.message || 'Failed to fetch feed posts');
          return;
        }

        const postsData = (data as Post[]) ?? [];

        if (postsData.length === 0) {
          if (targetPage === 0) {
            setPosts([]);
          }
          setHasMore(false);
          return;
        }

        const authorIds = [...new Set(postsData.map((post) => post.author_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, roll_number, branch, year, section, is_email_verified, username, is_verified, is_anonymous')
          .in('id', authorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const profilesData = (profiles as Profile[]) ?? [];
        const profileMap = new Map(
          profilesData.map((profile) => [profile.id, profile])
        );

        const postIds = postsData.map((post) => post.id);
        let voteMap = new Map<string, VoteType>();

        if (user?.id && postIds.length > 0) {
          const { data: votes, error: votesError } = await supabase
            .from('post_votes')
            .select('post_id, vote_type')
            .eq('user_id', user.id)
            .in('post_id', postIds);

          if (votesError) {
            console.error('Error fetching post votes:', votesError);
          } else {
            const votesData = (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
            voteMap = new Map(
              votesData.map((vote) => [vote.post_id, vote.vote_type])
            );
          }
        }

        const normalized = postsData.map((post) => ({
          ...post,
          profiles: profileMap.get(post.author_id) || null,
          comment_count: 0,
          user_vote: voteMap.get(post.id) ?? null,
        }));

        if (options?.reset || targetPage === 0) {
          setPosts(normalized);
        } else {
          setPosts((prev) => [...prev, ...normalized]);
        }

        setHasMore(postsData.length === PAGE_SIZE);
      } catch (error) {
        console.error('Unexpected error fetching feed posts:', error);
        setPostsError(
          error instanceof Error ? error.message : 'Something went wrong while fetching feed posts'
        );
      } finally {
        setPostsLoading(false);
      }
    },
    [supabase, user?.id]
  );

  const loadMore = useCallback(() => {
    if (!postsLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [page, postsLoading, hasMore, fetchPosts]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      try {
        setPage(0);
        setHasMore(true);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Feed initialization timeout')), 15000)
        );

        await Promise.race([
          Promise.all([fetchCommunities(), fetchPosts(0, { reset: true })]),
          timeoutPromise,
        ]);
      } catch (error) {
        console.error('Feed initialization error:', error);
        
        // If there's a database error, try to load with minimal data
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          setPostsError(`Failed to load feed: ${error.message}. Please refresh the page.`);
        } else {
          setPostsError('Failed to load feed. Please refresh the page.');
        }
        
        // Set empty state to allow UI to render
        setPosts([]);
        setCommunities([]);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Real-time subscription
    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'room=in.(campus,college)',
      }, () => {
        setPage(0);
        setHasMore(true);
        fetchPosts(0, { reset: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, authLoading, user, fetchPosts, fetchCommunities]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary gradient-bg">
        <RedditNavbar />
        <div className="flex pt-14">
          <RedditSidebar />
          <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
            <SkeletonFeed count={5} />
          </main>
          <div className="hidden xl:block w-80 p-4">
            <RedditRightPanel />
          </div>
        </div>
        <RedditMobileNav />
      </div>
    );
  }

  return (
    <ErrorBoundaryFunctional>
      <div className="min-h-screen bg-bg-primary gradient-bg">
        <RedditNavbar />
        <div className="flex pt-14">
          <RedditSidebar />
          
          {/* Main Content */}
          <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
            {/* Create Post Box */}
            {authProfile && (
              <div className="glass rounded-xl p-4 mb-6 neon-glow">
                  <EnhancedCreatePostForm
                    profile={authProfile}
                    communities={communities}
                    defaultCommunity="campus"
                    onPostCreated={() => {
                      setPage(0);
                      setHasMore(true);
                      fetchPosts(0, { reset: true });
                    }}
                  />
              </div>
            )}

            {/* Posts */}
            {postsError ? (
              <ErrorMessage
                message={postsError}
                onRetry={() => fetchPosts(0, { reset: true })}
              />
            ) : postsLoading && posts.length === 0 ? (
              <PostLoadingSkeleton count={2} />
            ) : posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                description="Be the first to share something with the campus!"
                icon={
                  <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-6 animate-glow">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                }
              />
            ) : (
              <div className="space-y-4">
                {posts.map((post, index) => (
                    <div 
                      key={post.id} 
                      className="transform transition-all duration-500"
                      style={{animationDelay: `${index * 100}ms`}}
                    >
                      <PostCard
                        post={post}
                        currentUserId={user?.id ?? null}
                        initialUserVote={post.user_vote ?? null}
                      />
                    </div>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={loadMore}
                      disabled={postsLoading}
                      className="px-6 py-3 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-accent-primary/30"
                    >
                      {postsLoading ? 'Loading...' : 'Load More Posts'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <div className="hidden xl:block w-80 p-4">
            <RedditRightPanel currentRoom="campus" />
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <RedditMobileNav />
      </div>
    </ErrorBoundaryFunctional>
  );
}
