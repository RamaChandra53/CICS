'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
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
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import TagFilter from '@/components/TagFilter';

const PAGE_SIZE = 15;

type VoteType = 'up' | 'down';

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
  const [postsError, setPostsError] = useState('');
  const [postsLoading, setPostsLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Store fetched posts per community in a ref
  const postCache = useRef<Record<string, { posts: Post[]; hasMore: boolean }>>({});
  const tagFilterInitialized = useRef(false);
  const postRoom = roomName;
  const supportsPosting = isMember;

  const fetchPosts = useCallback(
    async (pageToLoad = 0, options?: { reset?: boolean }) => {
      try {
        const roomFilters = postRoom === 'campus' ? ['campus', 'college'] : [postRoom];
        const cacheKey = `${roomFilters.join('|')}_${[...selectedTags].sort().join(',')}`;

        if (options?.reset) {
          setPage(0);
          setHasMore(true);
        }

        if (pageToLoad === 0 && postCache.current[cacheKey]) {
          const cached = postCache.current[cacheKey];

          if (user?.id && cached.posts.length > 0) {
            const cachedPostIds = cached.posts.map((post) => post.id);
            const { data: votes } = await supabase
              .from('post_votes')
              .select('post_id, vote_type')
              .eq('user_id', user.id)
              .in('post_id', cachedPostIds);

            const votesData =
              (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
            const voteMap = new Map(
              votesData.map((vote) => [vote.post_id, vote.vote_type])
            );

            const updatedPosts = cached.posts.map((post) => ({
              ...post,
              user_vote: voteMap.get(post.id) ?? null,
            }));

            postCache.current[cacheKey] = {
              posts: updatedPosts,
              hasMore: cached.hasMore,
            };

            setPosts(updatedPosts);
          } else {
            setPosts(cached.posts);
          }

          setHasMore(cached.hasMore);
          setPostsLoading(false);
          return;
        }

        setPostsLoading(true);
        setPostsError('');

        let query = supabase
          .from('posts')
          .select(
            'id, author_id, room, content, image_url, is_anon_post, display_mode, created_at, upvotes, downvotes, tags, profiles (id, username, roll_number, is_verified, is_anonymous, year, branch)'
          )
          .order('created_at', { ascending: false })
          .range(pageToLoad * PAGE_SIZE, pageToLoad * PAGE_SIZE + PAGE_SIZE - 1);

        if (roomFilters.length > 1) {
          query = query.in('room', roomFilters);
        } else {
          query = query.eq('room', roomFilters[0]);
        }

        if (selectedTags.length > 0) {
          const tagFilters = selectedTags.map((tag) => `tags.ilike.%${tag}%`).join(',');
          query = query.or(tagFilters);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching posts:', error);
          setPostsError(error.message || 'Failed to fetch posts');
          return;
        }

        const postsData = (data as Post[]) ?? [];
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
            const votesData =
              (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
            voteMap = new Map(
              votesData.map((vote) => [vote.post_id, vote.vote_type])
            );
          }
        }

        const normalized = postsData.map((post: Post) => ({
          ...post,
          comment_count: 0,
          user_vote: voteMap.get(post.id) ?? null,
        }));

        const cachedPosts = postCache.current[cacheKey]?.posts ?? [];
        const merged = pageToLoad === 0 ? normalized : [...cachedPosts, ...normalized];

        postCache.current[cacheKey] = {
          posts: merged,
          hasMore: normalized.length === PAGE_SIZE,
        };

        setPosts(merged);
        setHasMore(normalized.length === PAGE_SIZE);
      } catch (error) {
        console.error('Unexpected error fetching posts:', error);
        setPostsError(
          error instanceof Error ? error.message : 'Something went wrong while fetching posts'
        );
      } finally {
        setPostsLoading(false);
      }
    },
    [supabase, postRoom, selectedTags, user?.id]
  );

  // Prefetch adjacent communities
  const prefetchCommunities = useCallback(async (slugs: string[]) => {
    for (const slug of slugs) {
      const roomFilters = slug === 'campus' ? ['campus', 'college'] : [slug];
      const cacheKey = `${roomFilters.join('|')}_`;

      if (!postCache.current[cacheKey]) {
        try {
          let query = supabase
            .from('posts')
            .select(
              'id, author_id, room, content, image_url, is_anon_post, display_mode, created_at, upvotes, downvotes, tags, profiles (id, username, roll_number, is_verified, is_anonymous, year, branch)'
            )
            .order('created_at', { ascending: false })
            .range(0, PAGE_SIZE - 1);

          if (roomFilters.length > 1) {
            query = query.in('room', roomFilters);
          } else {
            query = query.eq('room', roomFilters[0]);
          }

          const { data } = await query;

          if (data) {
            const normalized = data.map((p: Post) => ({
              ...p,
              comment_count: p.comment_count || 0
            }));
            postCache.current[cacheKey] = {
              posts: normalized,
              hasMore: normalized.length === PAGE_SIZE,
            };
          }
        } catch (error) {
          console.error(`Error prefetching ${slug}:`, error);
        }
      }
    }
  }, [supabase]);

  // Handle community switching
  useEffect(() => {
    // When room changes, set switching state to show loading indicator
    setSwitching(true);
    const timer = setTimeout(() => setSwitching(false), 500); // Hide after 500ms
    return () => clearTimeout(timer);
  }, [roomName]);

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
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Room initialization timeout')), 20000)
        );

        const initPromise = async () => {
          try {
            // Parallel fetch community and membership data
            const [communityResult, memberResult] = await Promise.allSettled([
              supabase
                .from('communities')
                .select('id, name, slug, description, icon, type, member_count, created_at')
                .eq('slug', roomName)
                .maybeSingle(),
              // Only check membership if we have authProfile
              authProfile ? supabase
                .from('community_members')
                .select('user_id')
                .eq('user_id', authProfile.id)
                .eq('community_slug', roomName)
                .maybeSingle() : Promise.resolve({ data: null, error: null })
            ]);

            let communityData: any = null;
            let memberData: any = null;
            let communityError: any = null;
            let memberError: any = null;

            if (communityResult.status === 'fulfilled') {
              communityData = communityResult.value.data;
              communityError = communityResult.value.error;
            } else {
              communityError = communityResult.reason;
            }

            if (memberResult.status === 'fulfilled') {
              memberData = memberResult.value.data;
              memberError = memberResult.value.error;
            } else {
              memberError = memberResult.reason;
            }

            if (communityError) {
              console.error('Community fetch error:', communityError);
              throw new Error(communityError.message || 'Failed to fetch community');
            }

            // If no community found, check if it's a special room that allows viewing
            if (!communityData) {
              // Allow viewing confessions, rants, random, placement-talk without membership
              const allowedRooms = ['confessions', 'rants', 'random', 'placement-talk'];
              if (allowedRooms.includes(roomName)) {
                // Create a virtual community for display purposes
                const virtualCommunity: Community = {
                  id: roomName,
                  name: roomName.charAt(0).toUpperCase() + roomName.slice(1).replace('-', ' '),
                  slug: roomName,
                  description: `Share your ${roomName.replace('-', ' ')} anonymously`,
                  icon: roomName === 'confessions' ? '🤫' : roomName === 'rants' ? '😤' : roomName === 'random' ? '🎲' : '💼',
                  member_count: 0,
                  type: 'open',
                  created_at: new Date().toISOString()
                };
                setCommunity(virtualCommunity);
                setIsMember(false); // Non-members can view but not post
              } else {
                console.log('Community not found:', roomName);
                setError('Community not found');
                return;
              }
            } else {
              setCommunity(communityData as Community);
              
              // Handle membership check with error resilience
              if (memberError) {
                console.error('Membership check error:', memberError);
                // Don't throw error for membership check, just default to not member
                setIsMember(false);
              } else {
                setIsMember(Boolean(memberData));
              }
            }

            // Fetch posts separately to avoid blocking
            setPage(0);
            setHasMore(true);
            await fetchPosts(0, { reset: true });
            
            // After main feed loads, prefetch adjacent communities silently
            const allCommunities = ['campus', 'confessions', 'random', 'placement-talk', 'rants'];
            const currentIndex = allCommunities.indexOf(roomName);
            if (currentIndex !== -1) {
              const adjacentCommunities: string[] = [];
              // Get next 3 communities (circular)
              for (let i = 1; i <= 3; i++) {
                const nextIndex = (currentIndex + i) % allCommunities.length;
                adjacentCommunities.push(allCommunities[nextIndex]);
              }
              // Prefetch in background without blocking
              setTimeout(() => prefetchCommunities(adjacentCommunities), 2000); // Increased delay
            }
          } catch (error) {
            throw error; // Re-throw to be caught by outer try-catch
          }
        };

        await Promise.race([initPromise(), timeoutPromise]);
      } catch (error) {
        console.error('Room initialization error:', error);
        if (error instanceof Error && error.message === 'Room initialization timeout') {
          setError('Room page initialization timed out. Please try again.');
        } else {
          setError(error instanceof Error ? error.message : 'Failed to load room');
        }
      } finally {
        setLoading(false);
      }
    };

    init();

    // Map community slugs to room values for real-time subscription
    const roomFilter = roomName === 'campus' ? 'room=in.(campus,college)' : `room=eq.${roomName}`;
    
    const channel = supabase
      .channel(`room-${roomName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: roomFilter,
      }, () => {
        setPage(0);
        setHasMore(true);
        fetchPosts(0, { reset: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, postRoom, authProfile, roomName, authLoading, user, router, fetchPosts, prefetchCommunities]);

  useEffect(() => {
    if (tagFilterInitialized.current) {
      setPage(0);
      setHasMore(true);
      fetchPosts(0, { reset: true });
    } else {
      tagFilterInitialized.current = true;
    }
  }, [selectedTags, fetchPosts]);

  const loadMore = useCallback(() => {
    if (!postsLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [page, postsLoading, hasMore, fetchPosts]);

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

  if (error && !community) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#0b1416]">
          <RedditNavbar />
          <div className="flex pt-12">
            <RedditSidebar />
            <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
              <ErrorMessage
                title="Community not found"
                message={error || `The community r/${roomName} doesn't exist.`}
                onRetry={() => window.location.reload()}
              />
            </main>
            <div className="hidden xl:block w-80 p-4">
              <RedditRightPanel />
            </div>
          </div>
          <RedditMobileNav />
        </div>
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-[#0b1416]">
          <RedditNavbar />
          <div className="flex pt-12">
            <RedditSidebar />
            <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
              <PostLoadingSkeleton count={3} />
            </main>
            <div className="hidden xl:block w-80 p-4">
              <RedditRightPanel />
            </div>
          </div>
          <RedditMobileNav />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0b1416]">
        <RedditNavbar />
        <div className="flex pt-12">
          <RedditSidebar />
          
          {/* Main Content */}
          <main className="flex-1 max-w-[740px] mx-auto px-4 py-6">
            {/* Subtle loading indicator for community switching */}
            {switching && (
              <div className="h-1 bg-indigo-500 animate-pulse w-full mb-4" />
            )}
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

            {/* Tag Filter */}
            <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-4 mb-4">
              <TagFilter
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                maxTags={5}
              />
            </div>

            {/* Create Post */}
            {authProfile && supportsPosting && (
              <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-2 mb-4">
                <CreatePostForm
                  profile={authProfile}
                  defaultRoom={postRoom === 'campus' ? 'college' : postRoom}
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
                description={`Be the first to share something in r/${roomName}!`}
                icon={<div className="text-4xl">💬</div>}
              />
            ) : (
              <div className="space-y-2.5">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id ?? null}
                    initialUserVote={post.user_vote ?? null}
                  />
                ))}

                {postsLoading && posts.length > 0 && (
                  <div className="py-4 text-center text-xs text-gray-400">Loading more posts...</div>
                )}

                {hasMore && !postsLoading && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={loadMore}
                      className="rounded-lg border border-gray-700 px-4 py-2 text-xs text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                    >
                      Load more posts
                    </button>
                  </div>
                )}
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
    </ErrorBoundary>
  );
}
