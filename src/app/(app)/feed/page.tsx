'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile } from '@/types';
import PostCard from '@/components/PostCard';
import CreatePostForm from '@/components/CreatePostForm';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RedditNavbar from '@/components/RedditNavbar';
import RedditSidebar from '@/components/RedditSidebar';
import RedditRightPanel from '@/components/RedditRightPanel';
import RedditMobileNav from '@/components/RedditMobileNav';

export default function FeedPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data as Profile | null;
  }, [supabase]);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, is_verified, is_anonymous),
        comment_count:comments(count)
      `)
      .eq('room', 'college')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const normalized = data.map((p: Post & { comment_count: { count: number }[] }) => ({
        ...p,
        comment_count: p.comment_count?.[0]?.count ?? 0,
      }));
      setPosts(normalized);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/');
        return;
      }
      
      await fetchPosts();
      setLoading(false);
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
      <div className="min-h-screen bg-[#0b1416]">
        <RedditNavbar />
        <div className="flex pt-12">
          <RedditSidebar />
          <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
            <div className="space-y-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] flex animate-pulse">
                  <div className="w-10 bg-[#161617]"></div>
                  <div className="flex-1 p-2">
                    <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"/>
                    <div className="h-3 bg-gray-700 rounded w-full mb-1"/>
                    <div className="h-3 bg-gray-700 rounded w-3/4"/>
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
    <div className="min-h-screen bg-[#0b1416]">
      <RedditNavbar />
      <div className="flex pt-12">
        <RedditSidebar />
        
        {/* Main Content */}
        <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
          {/* Create Post Box */}
          {authProfile && (
            <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-2 mb-4">
              <CreatePostForm
                profile={authProfile}
                defaultRoom="college"
                onPostCreated={fetchPosts}
              />
            </div>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-8 text-center">
              <div className="text-4xl mb-3">👀</div>
              <p className="text-[#d7dadc]">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
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
  );
}
