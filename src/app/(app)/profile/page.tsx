'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile } from '@/types';
import PostCard from '@/components/PostCard';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserPosts = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, is_verified, is_anonymous),
        comment_count:comments(count)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(prof as Profile);
      await fetchUserPosts(user.id);
      setLoading(false);
    };
    init();
  }, [supabase, router, fetchUserPosts]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-700"/>
            <div className="flex-1">
              <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"/>
              <div className="h-3 bg-gray-700 rounded w-1/4"/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile card */}
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
            profile.is_anonymous ? 'bg-gray-700' : 'bg-indigo-600/30'
          }`}>
            {profile.is_anonymous ? '👻' : (profile.username?.[0]?.toUpperCase() ?? '?')}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-white font-bold text-xl">{profile.username}</h1>
              {profile.is_verified && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  ✓ verified
                </span>
              )}
              {profile.is_anonymous && (
                <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                  Anonymous
                </span>
              )}
            </div>

            {profile.full_name && (
              <p className="text-gray-400 text-sm mb-1">{profile.full_name}</p>
            )}

            {!profile.is_anonymous && (
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.year && (
                  <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                    📅 {profile.year} Year
                  </span>
                )}
                {profile.branch && (
                  <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                    💻 {profile.branch}
                  </span>
                )}
                {profile.section && (
                  <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                    👥 Section {profile.section}
                  </span>
                )}
                {profile.roll_number && (
                  <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                    🪪 {profile.roll_number}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-800/40 flex items-center justify-between">
          <span className="text-gray-500 text-sm">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSignOut}
            className="text-red-400 hover:text-red-300 text-sm transition-colors flex items-center gap-1.5"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-gray-400 text-sm font-medium mb-3">Your Posts</h2>
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl">
          <div className="text-3xl mb-2">✏️</div>
          <p className="text-gray-500 text-sm">You haven&apos;t posted anything yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} showRoom />
          ))}
        </div>
      )}
    </div>
  );
}
