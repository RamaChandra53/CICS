'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Post } from '@/types';
import PostCard from '@/components/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import Link from 'next/link';

type SearchTab = 'posts' | 'people' | 'communities';

type VoteType = 'up' | 'down';

type PublicUser = {
  id: string;
  pseudo_username: string | null;
  is_verified: boolean;
  is_email_verified: boolean;
  year: string | null;
  branch: string | null;
  real_display_name: string | null;
};

type CommunityResult = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  member_count: number;
};

export default function SearchPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('posts');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Results
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [communities, setCommunities] = useState<CommunityResult[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQuery = useRef('');

  const searchPosts = useCallback(
    async (searchQuery: string) => {
      const { data, error } = await supabase
        .from('posts')
        .select(
          'id, author_id, room, content, image_url, video_url, link_url, poll_options, poll_expires_at, post_type, is_anon_post, display_mode, created_at, upvotes, downvotes, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name), comment_count:comments(count)'
        )
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Post search error:', error);
        return;
      }

      const rawPosts = (data as Array<Post & { comment_count?: { count: number }[] }>) ?? [];

      // Fetch votes
      let voteMap = new Map<string, VoteType>();
      const postIds = rawPosts.map((p) => p.id);

      if (user?.id && postIds.length > 0) {
        const { data: votes } = await supabase
          .from('post_votes')
          .select('post_id, vote_type')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        if (votes) {
          voteMap = new Map(
            (votes as Array<{ post_id: string; vote_type: VoteType }>).map((v) => [
              v.post_id,
              v.vote_type,
            ])
          );
        }
      }

      const normalized = rawPosts.map((p) => ({
        ...p,
        comment_count: Array.isArray(p.comment_count)
          ? p.comment_count?.[0]?.count ?? 0
          : (p.comment_count as unknown as number) ?? 0,
        user_vote: voteMap.get(p.id) ?? null,
      }));

      setPosts(normalized);
    },
    [supabase, user?.id]
  );

  const searchPeople = useCallback(
    async (searchQuery: string) => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, pseudo_username, is_verified, is_email_verified, year, branch, real_display_name')
        .or(
          `pseudo_username.ilike.%${searchQuery}%,real_display_name.ilike.%${searchQuery}%`
        )
        .limit(20);

      if (error) {
        console.error('People search error:', error);
        return;
      }

      setPeople((data as PublicUser[]) ?? []);
    },
    [supabase]
  );

  const searchCommunities = useCallback(
    async (searchQuery: string) => {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, slug, description, icon, member_count')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order('member_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Community search error:', error);
        return;
      }

      setCommunities((data as CommunityResult[]) ?? []);
    },
    [supabase]
  );

  const executeSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setPosts([]);
        setPeople([]);
        setCommunities([]);
        setHasSearched(false);
        return;
      }

      latestQuery.current = searchQuery;
      setLoading(true);
      setHasSearched(true);

      try {
        await Promise.all([
          searchPosts(searchQuery),
          searchPeople(searchQuery),
          searchCommunities(searchQuery),
        ]);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        // Only clear loading if this is still the latest query
        if (latestQuery.current === searchQuery) {
          setLoading(false);
        }
      }
    },
    [searchPosts, searchPeople, searchCommunities]
  );

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim()) {
      setPosts([]);
      setPeople([]);
      setCommunities([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      executeSearch(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, executeSearch]);

  const tabs: { id: SearchTab; label: string; count: number }[] = [
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'people', label: 'People', count: people.length },
    { id: 'communities', label: 'Communities', count: communities.length },
  ];

  const currentResults = tab === 'posts' ? posts : tab === 'people' ? people : communities;

  return (
    <ErrorBoundary>
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* Search input */}
        <div className="mb-4">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, people, communities..."
              autoFocus
              className="w-full h-12 rounded-xl border border-[#252a31] bg-[#15181c] pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {hasSearched && (
          <div className="mb-4 flex gap-1 rounded-xl border border-[#252a31] bg-[#0f1318] p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">({t.count})</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <PostLoadingSkeleton count={3} />
        ) : !hasSearched ? (
          <EmptyState
            title="Search CICS"
            description="Find posts, people, and communities across your campus."
            icon={
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            }
          />
        ) : currentResults.length === 0 ? (
          <EmptyState
            title="No results found"
            description={`No ${tab} found for "${query}". Try a different search term.`}
            icon={<div className="text-3xl">🔍</div>}
          />
        ) : (
          <div className="space-y-3">
            {/* Posts results */}
            {tab === 'posts' &&
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showRoom
                  currentUserId={user?.id ?? null}
                  initialUserVote={post.user_vote ?? null}
                />
              ))}

            {/* People results */}
            {tab === 'people' &&
              people.map((person) => (
                <Link
                  key={person.id}
                  href={`/user/${person.id}`}
                  className="block rounded-2xl border border-[#252a31] bg-[#15181c] p-4 transition-colors hover:border-[#353a41]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-indigo-600/30 text-indigo-200 shrink-0">
                      {(person.pseudo_username || 'U')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {person.pseudo_username || 'Campus Member'}
                        </span>
                        {(person.is_verified || person.is_email_verified) && (
                          <span className="text-[10px] font-semibold text-indigo-300">✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {person.year && <span>{person.year} Year</span>}
                        {person.branch && <span>· {person.branch}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

            {/* Communities results */}
            {tab === 'communities' &&
              communities.map((c) => (
                <Link
                  key={c.id}
                  href={`/room/${c.slug}`}
                  className="block rounded-2xl border border-[#252a31] bg-[#15181c] p-4 transition-colors hover:border-[#353a41]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-[#1f2329] shrink-0">
                      {c.icon || '🏠'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                      {c.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {c.member_count} member{c.member_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
