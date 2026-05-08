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
        .select('*')
        .order('member_count', { ascending: false });

      if (error) {
        console.error('Error fetching communities:', error);
        return;
      }

      setCommunities(data || []);
    } catch (error) {
      console.error('Unexpected error fetching communities:', error);
    }
  }, [supabase]);

  const fetchPosts = useCallback(async (page = 0) => {
    try {
      setPostsLoading(true);
      setPostsError('');

      // Single joined query to fetch posts with profiles and votes
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(roll_number, branch, year, section, is_email_verified, username, is_verified, is_anonymous),
          post_votes(vote_type, user_id)
        `)
        .eq('room', 'college')
        .order('created_at', { ascending: false })
        .range(page * 20, (page + 1) * 20 - 1);

      if (error) {
        console.error('Error fetching feed posts:', error);
        setPostsError(error.message || 'Failed to fetch feed posts');
        return;
      }

      if (data) {
        const normalized = data.map((p: Post) => ({
          ...p,
          comment_count: 0, // Set default for now, can be fetched separately if needed
        }));
        
        if (page === 0) {
          setPosts(normalized);
        } else {
          setPosts(prev => [...prev, ...normalized]);
        }
        
        // Check if there are more posts to load
        setHasMore(data.length === 20);
      }
    } catch (error) {
      console.error('Unexpected error fetching feed posts:', error);
      setPostsError(error instanceof Error ? error.message : 'Something went wrong while fetching feed posts');
    } finally {
      setPostsLoading(false);
    }
  }, [supabase]);

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
        console.log('Feed page: Starting initialization...');
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Feed initialization timeout')), 60000)
        );

        const fetchPromise = async () => {
          console.log('Feed page: Fetching posts...');
          setPage(0);
          setHasMore(true);
          await fetchCommunities();
          await fetchPosts(0);
          console.log('Feed page: Posts and communities fetched');
        };

        await Promise.race([fetchPromise(), timeoutPromise]);
        console.log('Feed page: Initialization completed');
      } catch (error) {
        console.error('Feed initialization error:', error);
        if (error instanceof Error && error.message === 'Feed initialization timeout') {
          console.error('Feed page initialization timed out');
          setPostsError('Feed loading timed out. Please try again.');
        } else {
          setPostsError(error instanceof Error ? error.message : 'Failed to load feed');
        }
      } finally {
        console.log('Feed page: Setting loading to false');
        setLoading(false);
      }
    };
    init();

    // Real-time subscription
    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: 'room=eq.college',
      }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, authLoading, user, fetchPosts]);

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
                  onPostCreated={fetchPosts}
                />
              </div>
            )}

            {/* Posts */}
            {postsError ? (
              <ErrorMessage
                message={postsError}
                onRetry={fetchPosts}
              />
            ) : postsLoading ? (
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
                    <PostCard post={post} />
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
