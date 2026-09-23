'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { CommunitySummary } from '@/types/domain';
import { useAuth } from '@/contexts/AuthContext';
import { clearCommunityCaches, fetchCommunities as fetchCommunityList, isClubCommunity } from '@/lib/services/communities';

const COMMUNITY_ICONS: Record<string, string> = {
  campus: '🎓',
  confessions: '🤫',
  placements: '💼',
  clubs: '🎭',
  alumni: '🎓',
};

export default function CommunitiesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useAuth();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [userCommunities, setUserCommunities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    try {
      setCommunities(await fetchCommunityList(supabase));
    } catch (error) {
      console.error('Unexpected error fetching communities:', error);
    }
  }, [supabase]);

  const fetchUserMemberships = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('community_slug')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching memberships:', error);
        return;
      }

      setUserCommunities(new Set((data || []).map((m: { community_slug: string }) => m.community_slug)));
    } catch (error) {
      console.error('Unexpected error fetching memberships:', error);
    }
  }, [supabase, user]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchCommunities(), fetchUserMemberships()]);
      setLoading(false);
    };
    init();
  }, [fetchCommunities, fetchUserMemberships]);

  const handleJoinLeave = async (communitySlug: string) => {
    if (!user || joinLoading) return;

    // Don't allow leaving campus
    if (communitySlug === 'campus' && userCommunities.has(communitySlug)) return;

    setJoinLoading(communitySlug);
    const isMember = userCommunities.has(communitySlug);

    try {
      if (isMember) {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .eq('user_id', user.id)
          .eq('community_slug', communitySlug);

        if (error) throw error;

        setUserCommunities(prev => {
          const next = new Set(prev);
          next.delete(communitySlug);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('community_members')
          .upsert({ user_id: user.id, community_slug: communitySlug }, {
            onConflict: 'user_id,community_slug'
          });

        if (error) throw error;

        setUserCommunities(prev => new Set(prev).add(communitySlug));
      }

      // Refresh member counts
      clearCommunityCaches(user.id);
      fetchCommunities();
    } catch (error) {
      console.error('Error joining/leaving community:', error);
    } finally {
      setJoinLoading(null);
    }
  };

  const getIcon = (community: CommunitySummary) => {
    return community.icon || COMMUNITY_ICONS[community.slug] || '📌';
  };

  const accessibleSlugs = useMemo(() => {
    const slugs = new Set(['campus', 'confessions', 'placements']);

    if (!profile?.year) {
      slugs.add('alumni');
      return slugs;
    }

    const yearNumber = profile.year.replace(/\D/g, '');
    if (yearNumber) slugs.add(`year-${yearNumber}`);
    if (profile.branch) slugs.add(profile.branch.toLowerCase());
    if (profile.branch && profile.section) {
      slugs.add(`${profile.branch.toLowerCase()}-${profile.section.toLowerCase()}`);
    }

    return slugs;
  }, [profile]);

  const visibleCommunities = communities.filter(
    (community) => accessibleSlugs.has(community.slug) && !isClubCommunity(community)
  );
  const myCommunities = visibleCommunities.filter(c => userCommunities.has(c.slug));
  const otherCommunities = visibleCommunities.filter(
    c => !userCommunities.has(c.slug) && c.type === 'open'
  );

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#15181c] border border-[#252a31] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1f2329] rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#1f2329] rounded w-1/3" />
                <div className="h-3 bg-[#1f2329] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white">Communities</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Your academic spaces are based on your verified roll number, year, branch, and section.
        </p>
      </div>

      {/* MY COMMUNITIES Section */}
      {myCommunities.length > 0 && (
        <div className="mb-6">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3 px-1">
            MY COMMUNITIES
          </div>

          <div className="bg-[#15181c] border border-[#252a31] rounded-2xl overflow-hidden">
            {myCommunities.map((community, index) => (
              <div
                key={community.id}
                className={`flex items-center gap-3 p-4 transition-colors ${index !== 0 ? 'border-t border-[#252a31]' : ''
                  }`}
              >
                <Link
                  href={`/room/${community.slug}`}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 bg-[#1f2329] rounded-full flex items-center justify-center text-xl shrink-0">
                    {getIcon(community)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium text-base truncate">{community.name}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>r/{community.slug}</span>
                      <span className="text-slate-600">·</span>
                      <span>{community.member_count} member{community.member_count !== 1 ? 's' : ''}</span>
                    </div>
                    {community.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{community.description}</p>
                    )}
                  </div>
                </Link>

                {community.type === 'open' && community.slug !== 'campus' && (
                  <button
                    onClick={() => handleJoinLeave(community.slug)}
                    disabled={joinLoading === community.slug}
                    className="shrink-0 h-8 rounded-full border border-[#252a31] px-4 text-xs font-medium text-slate-300 hover:text-red-300 hover:border-red-800/40 transition-colors disabled:opacity-50"
                  >
                    {joinLoading === community.slug ? '...' : 'Leave'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OTHER COMMUNITIES Section */}
      {otherCommunities.length > 0 && (
        <div className="mb-6">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-3 px-1">
            DISCOVER
          </div>

          <div className="bg-[#15181c] border border-[#252a31] rounded-2xl overflow-hidden">
            {otherCommunities.map((community, index) => (
              <div
                key={community.id}
                className={`flex items-center gap-3 p-4 transition-colors ${index !== 0 ? 'border-t border-[#252a31]' : ''
                  }`}
              >
                <Link
                  href={`/room/${community.slug}`}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 bg-[#1f2329] rounded-full flex items-center justify-center text-xl shrink-0">
                    {getIcon(community)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-medium text-base truncate">{community.name}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <span>r/{community.slug}</span>
                      <span className="text-slate-600">·</span>
                      <span>{community.member_count} member{community.member_count !== 1 ? 's' : ''}</span>
                    </div>
                    {community.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{community.description}</p>
                    )}
                  </div>
                </Link>

                <button
                  onClick={() => handleJoinLeave(community.slug)}
                  disabled={joinLoading === community.slug}
                  className="shrink-0 h-8 rounded-full bg-indigo-600 px-4 text-xs font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {joinLoading === community.slug ? '...' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleCommunities.length === 0 && (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🏘️</div>
          <p className="text-slate-400 text-sm">No academic communities found</p>
        </div>
      )}
    </div>
  );
}
