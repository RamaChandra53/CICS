'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile, Community } from '@/types';
import PostCard from '@/components/PostCard';
import CreatePostForm from '@/components/CreatePostForm';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function RoomPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const roomName = params.roomName as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const postRoom = roomName;
  const supportsPosting = true;

  const fetchPosts = useCallback(async () => {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, is_verified, is_anonymous),
        comment_count:comments(count)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (roomName !== 'campus') {
      query = query.eq('room', postRoom);
    }

    const { data } = await query;
    if (data) {
      const normalized = data.map((p: Post & { comment_count: { count: number }[] }) => ({
        ...p,
        comment_count: p.comment_count?.[0]?.count ?? 0,
      }));
      setPosts(normalized);
    }
  }, [supabase, roomName, postRoom]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!prof) {
        router.push('/');
        return;
      }

      const typedProf = prof as Profile;
      setProfile(typedProf);

      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .eq('slug', roomName)
        .maybeSingle();

      if (!communityData) {
        setLoading(false);
        return;
      }
      setCommunity(communityData as Community);

      const { data: memberData } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('user_id', typedProf.id)
        .eq('community_slug', roomName)
        .maybeSingle();
      setIsMember(Boolean(memberData));

      await fetchPosts();
      setLoading(false);
    };

    init();

    const channel = supabase
      .channel(`room-${roomName}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: roomName === 'campus' ? undefined : `room=eq.${roomName}`,
      }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, roomName, fetchPosts]);

  const handleMembershipToggle = async () => {
    if (!profile || !community || community.type !== 'open' || joinLoading) return;
    setJoinLoading(true);
    setError('');
    try {
      if (isMember) {
        if (community.slug === 'campus') {
          throw new Error('You cannot leave r/campus.');
        }
        const { error: leaveError } = await supabase
          .from('community_members')
          .delete()
          .eq('user_id', profile.id)
          .eq('community_slug', community.slug);
        if (leaveError) throw leaveError;
        setIsMember(false);
        setCommunity(prev => prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : prev);
      } else {
        const { error: joinError } = await supabase
          .from('community_members')
          .insert({ user_id: profile.id, community_slug: community.slug });
        if (joinError) throw joinError;
        setIsMember(true);
        setCommunity(prev => prev ? { ...prev, member_count: prev.member_count + 1 } : prev);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update membership.');
    } finally {
      setJoinLoading(false);
    }
  };

  if (!community && !loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <p className="text-gray-400">Community not found</p>
        <Link href="/feed" className="text-indigo-400 text-sm mt-2 block hover:underline">← Back to Feed</Link>
      </div>
    );
  }

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {community?.icon ?? '💬'} r/{community?.slug}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{community?.description ?? 'Community feed'}</p>
            <p className="text-gray-600 text-xs mt-1">
              {community?.member_count ?? 0} member{(community?.member_count ?? 0) === 1 ? '' : 's'}
            </p>
          </div>
          {community?.type === 'open' && profile && (
            <button
              onClick={handleMembershipToggle}
              disabled={joinLoading || community.slug === 'campus'}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {joinLoading ? '...' : community.slug === 'campus' ? 'Required' : isMember ? 'Leave' : 'Join'}
            </button>
          )}
        </div>
        {error && (
          <p className="text-red-400 text-xs mt-3 bg-red-900/20 border border-red-800/40 rounded-lg p-2">
            {error}
          </p>
        )}
      </div>

      {/* Create post */}
      {profile && supportsPosting && (
        <div className="mb-6">
          <CreatePostForm
            profile={profile}
            defaultRoom={postRoom}
            onPostCreated={fetchPosts}
          />
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-gray-500">No posts yet in this community. Start the conversation!</p>
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
