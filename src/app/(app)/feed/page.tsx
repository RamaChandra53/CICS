'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile } from '@/types';
import PostCard from '@/components/PostCard';
import EnhancedCreatePostForm from '@/components/EnhancedCreatePostForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RedditNavbar from '@/components/RedditNavbar';
import RedditSidebar from '@/components/RedditSidebar';
import RedditRightPanel from '@/components/RedditRightPanel';
import RedditMobileNav from '@/components/RedditMobileNav';
import ErrorBoundaryModern from '@/components/ErrorBoundaryModern';

export default function FeedPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data as Profile | null;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  }, [supabase]);

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

  const fetchPosts = useCallback(async () => {
    try {
      // Optimized query without subquery for better performance
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, username, is_verified, is_anonymous),
          display_mode
        `)
        .eq('room', 'college')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching feed posts:', error);
        return;
      }

      if (data) {
        const normalized = data.map((p: Post) => ({
          ...p,
          comment_count: 0, // Set default for now, can be fetched separately if needed
        }));
        setPosts(normalized);
      }
    } catch (error) {
      console.error('Unexpected error fetching feed posts:', error);
    }
  }, [supabase]);

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
          await fetchCommunities();
          await fetchPosts();
          console.log('Feed page: Posts and communities fetched');
        };

        await Promise.race([fetchPromise(), timeoutPromise]);
        console.log('Feed page: Initialization completed');
      } catch (error) {
        console.error('Feed initialization error:', error);
        if (error instanceof Error && error.message === 'Feed initialization timeout') {
          console.error('Feed page initialization timed out');
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
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass rounded-xl p-4 animate-pulse-slow">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-bg-secondary rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-bg-secondary rounded w-1/3"></div>
                      <div className="h-3 bg-bg-secondary rounded w-full"></div>
                      <div className="h-3 bg-bg-secondary rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
    <ErrorBoundaryModern>
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
            {posts.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center animate-float">
                <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-6 animate-glow">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">No posts yet</h3>
                <p className="text-text-secondary">Be the first to share something with the campus!</p>
              </div>
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
    </ErrorBoundaryModern>
  );
}
