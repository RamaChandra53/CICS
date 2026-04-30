'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile, ROOMS } from '@/types';
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
  const profileRef = useRef<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const room = ROOMS.find(r => r.id === roomName);

  const fetchPosts = useCallback(async (prof: Profile, uid: string) => {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles (id, username, is_verified, is_anonymous),
        comment_count:comments(count),
        post_votes!left(vote_type)
      `)
      .eq('room', roomName)
      .eq('post_votes.user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter by year/branch/section for targeted rooms
    if (roomName === 'year' && prof.year) {
      query = query.eq('year_tag', prof.year);
    }
    if (roomName === 'branch' && prof.branch) {
      query = query.eq('branch_tag', prof.branch);
    }
    if (roomName === 'section') {
      if (prof.year) query = query.eq('year_tag', prof.year);
      if (prof.branch) query = query.eq('branch_tag', prof.branch);
      if (prof.section) query = query.eq('section_tag', prof.section);
    }

    const { data } = await query;
    if (data) {
      const normalized = data.map((p: Post & { comment_count: { count: number }[]; post_votes: { vote_type: string }[] }) => {
        const { post_votes, comment_count, ...rest } = p;
        return {
          ...rest,
          comment_count: comment_count?.[0]?.count ?? 0,
          user_vote: (post_votes?.[0]?.vote_type as 'up' | 'down') ?? null,
        };
      });
      setPosts(normalized);
    }
  }, [supabase, roomName]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      userIdRef.current = user.id;
      setUserId(user.id);

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
      profileRef.current = typedProf;
      setProfile(typedProf);

      // Check access
      const restrictedToVerified = ['year', 'branch', 'section'];
      if (typedProf.is_anonymous && restrictedToVerified.includes(roomName)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      await fetchPosts(typedProf, user.id);
      setLoading(false);
    };

    init();

    // Real-time subscription — only listen for new/deleted posts, not UPDATE events
    // (UPDATE events are triggered by vote count changes and would overwrite optimistic state)
    const handleRealtimeInsertDelete = () => {
      if (profileRef.current && userIdRef.current) {
        fetchPosts(profileRef.current, userIdRef.current);
      }
    };

    const channel = supabase
      .channel(`room-${roomName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: `room=eq.${roomName}`,
      }, handleRealtimeInsertDelete)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: `room=eq.${roomName}`,
      }, handleRealtimeInsertDelete)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, roomName, fetchPosts]);

  if (!room) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <p className="text-gray-400">Room not found</p>
        <Link href="/feed" className="text-indigo-400 text-sm mt-2 block hover:underline">← Back to Feed</Link>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-white font-bold text-xl mb-2">Verified Users Only</h2>
        <p className="text-gray-400 text-sm mb-4">
          This room is only available to students with verified accounts.
        </p>
        <Link href="/feed" className="text-indigo-400 text-sm hover:underline">← Back to Feed</Link>
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

  const getRoomSubtitle = () => {
    if (!profile) return room.description;
    if (roomName === 'year') return `${profile.year} Year students`;
    if (roomName === 'branch') return `${profile.branch} students`;
    if (roomName === 'section') return `${profile.branch}-${profile.section} ${profile.year} Year`;
    return room.description;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {room.icon} {room.label}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{getRoomSubtitle()}</p>
      </div>

      {/* Create post */}
      {profile && (
        <div className="mb-6">
          <CreatePostForm
            profile={profile}
            defaultRoom={roomName}
            onPostCreated={() => { if (userId) fetchPosts(profile, userId); }}
          />
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-gray-500">No posts yet in this room. Start the conversation!</p>
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
