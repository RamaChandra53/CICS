'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile } from '@/types';
import PostCard from '@/components/PostCard';
import CreatePostForm from '@/components/CreatePostForm';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const supabase = createClient();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    return data as Profile | null;
  }, [supabase]);

  const fetchPosts = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, is_verified, is_anonymous),
        comment_count:comments(count),
        post_votes!left(vote_type)
      `)
      .eq('room', 'college')
      .eq('post_votes.user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const normalized = data.map((p: Post & { comment_count: { count: number }[]; post_votes: { vote_type: string }[] }) => ({
        ...p,
        comment_count: p.comment_count?.[0]?.count ?? 0,
        user_vote: (p.post_votes?.[0]?.vote_type as 'up' | 'down') ?? null,
        post_votes: undefined,
      }));
      setPosts(normalized);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUserId(user.id);
      const prof = await fetchProfile(user.id);
      setProfile(prof);
      await fetchPosts(user.id);
      setLoading(false);
    };
    init();

    // Real-time subscription — only listen for new/deleted posts, not UPDATE events
    // (UPDATE events are triggered by vote count changes and would overwrite optimistic state)
    const handleRealtimeInsertDelete = () => {
      if (userId) fetchPosts(userId);
    };

    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'room=eq.college',
      }, handleRealtimeInsertDelete)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: 'room=eq.college',
      }, handleRealtimeInsertDelete)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, fetchProfile, fetchPosts, userId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"/>
              <div className="h-3 bg-gray-700 rounded w-full mb-2"/>
              <div className="h-3 bg-gray-700 rounded w-3/4"/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🏠 College Feed
        </h1>
        <p className="text-gray-500 text-sm mt-1">Everything from everyone in the college</p>
      </div>

      {/* Create post */}
      {profile && (
        <div className="mb-6">
          <CreatePostForm
            profile={profile}
            defaultRoom="college"
            onPostCreated={() => { if (userId) fetchPosts(userId); }}
          />
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👀</div>
          <p className="text-gray-500">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
