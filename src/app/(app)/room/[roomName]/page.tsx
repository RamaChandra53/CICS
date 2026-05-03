'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Community, Profile } from '@/types';
import PostCard from '@/components/PostCard';
import CreatePostForm from '@/components/CreatePostForm';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import RedditNavbar from '@/components/RedditNavbar';
import RedditSidebar from '@/components/RedditSidebar';
import RedditRightPanel from '@/components/RedditRightPanel';
import RedditMobileNav from '@/components/RedditMobileNav';

export default function RoomPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const roomName = params.roomName as string;
  const { user, profile: authProfile, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const postRoom = roomName;
  const supportsPosting = isMember;

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

    // Map community slugs to room values
    let roomFilter = postRoom;
    if (postRoom === 'campus') roomFilter = 'college';
    
    query = query.eq('room', roomFilter);

    const { data } = await query;
    if (data) {
      const normalized = data.map((p: Post & { comment_count: { count: number }[] }) => ({
        ...p,
        comment_count: p.comment_count?.[0]?.count ?? 0,
      }));
      setPosts(normalized);
    }
  }, [supabase, postRoom]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      if (!authProfile) {
        router.push('/');
        return;
      }

      try {
        const { data: communityData, error: communityError } = await supabase
          .from('communities')
          .select('*')
          .eq('slug', roomName)
          .maybeSingle();

        if (communityError) {
          console.error('Community fetch error:', communityError);
          setLoading(false);
          return;
        }

        if (!communityData) {
          console.log('Community not found:', roomName);
          setLoading(false);
          return;
        }
        
        setCommunity(communityData as Community);

        const { data: memberData } = await supabase
          .from('community_members')
          .select('user_id')
          .eq('user_id', authProfile.id)
          .eq('community_slug', roomName)
          .maybeSingle();
        setIsMember(Boolean(memberData));

        await fetchPosts();
      } catch (error) {
        console.error('Room initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Map community slugs to room values for real-time subscription
    const roomFilter = roomName === 'campus' ? 'college' : roomName;
    
    const channel = supabase
      .channel(`room-${roomName}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: roomName === 'campus' ? undefined : `room=eq.${roomFilter}`,
      }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, postRoom, authProfile, roomName, fetchPosts]);

  const handleMembershipToggle = async () => {
    if (!authProfile || !community || community.type !== 'open' || joinLoading) return;
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
          .eq('user_id', authProfile.id)
          .eq('community_slug', community.slug);
        if (leaveError) throw leaveError;
        setIsMember(false);
        setCommunity(prev => prev ? { ...prev, member_count: Math.max(0, prev.member_count - 1) } : prev);
      } else {
        const { error: joinError } = await supabase
          .from('community_members')
          .insert({ user_id: authProfile.id, community_slug: community.slug });
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
      <div className="min-h-screen bg-[#0b1416]">
        <RedditNavbar />
        <div className="flex pt-12">
          <RedditSidebar />
          <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
            <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-8 text-center">
              <div className="text-4xl mb-3">🚫</div>
              <h2 className="text-[#d7dadc] text-lg font-bold mb-2">Community not found</h2>
              <p className="text-[#818384] mb-4">The community r/{roomName} doesn't exist yet.</p>
              <Link href="/feed" className="text-[#0079d3] hover:underline text-sm">
                ← Back to Feed
              </Link>
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
          {/* Community Header */}
          <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-[#343536] rounded-full flex items-center justify-center text-2xl">
                  {community?.icon ?? '💬'}
                </div>
                <div>
                  <h1 className="text-[16px] font-bold text-[#d7dadc] flex items-center gap-2">
                    r/{community?.slug}
                  </h1>
                  <p className="text-[#818384] text-[12px] mt-1">{community?.description ?? 'Community feed'}</p>
                  <p className="text-[#818384] text-[12px] mt-1">
                    {community?.member_count ?? 0} member{(community?.member_count ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {community?.type === 'open' && authProfile && (
                <button
                  onClick={handleMembershipToggle}
                  disabled={joinLoading || community.slug === 'campus'}
                  className="bg-[#0079d3] hover:bg-[#1a76d3] text-white text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joinLoading ? '...' : community.slug === 'campus' ? 'Required' : isMember ? 'Joined' : 'Join'}
                </button>
              )}
            </div>
            {error && (
              <p className="text-[#ff4500] text-xs mt-3 bg-red-900/20 border border-red-800/40 rounded-lg p-2">
                {error}
              </p>
            )}
          </div>

          {/* Create Post */}
          {authProfile && supportsPosting && (
            <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-2 mb-4">
              <CreatePostForm
                profile={authProfile}
                defaultRoom={postRoom === 'campus' ? 'college' : postRoom}
                onPostCreated={fetchPosts}
              />
            </div>
          )}

          {/* Posts */}
          {posts.length === 0 ? (
            <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-8 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-[#d7dadc]">No posts yet in r/{roomName}. Start the conversation!</p>
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
          <RedditRightPanel currentRoom={roomName} />
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <RedditMobileNav />
    </div>
  );
}
