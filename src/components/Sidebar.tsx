'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Community } from '@/types';
import { createClient } from '@/lib/supabase';

async function ensureMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  slug: string
) {
  const { error } = await supabase
    .from('community_members')
    .upsert({ user_id: userId, community_slug: slug }, { onConflict: 'user_id,community_slug' });
  if (error) throw error;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [exploreCommunities, setExploreCommunities] = useState<Community[]>([]);

  const renderCommunityLink = (community: Community) => {
    const href = `/room/${community.slug}`;
    const isActive = pathname === href || pathname.startsWith(`/room/${community.slug}`);
    return (
      <Link
        key={community.id}
        href={href}
        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
          isActive
            ? 'bg-indigo-600/20 text-indigo-400 font-medium'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
        }`}
      >
        <span className="text-base">{community.icon ?? '💬'}</span>
        <span className="min-w-0">
          <span className="block truncate">r/{community.slug}</span>
          <span className="block text-[10px] text-gray-500">
            {community.member_count} member{community.member_count === 1 ? '' : 's'}
          </span>
        </span>
      </Link>
    );
  };

  const fetchJoinedCommunities = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_anonymous, year, branch, section')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) return;

    const { data: membershipData } = await supabase
      .from('community_members')
      .select(`
        communities (
          id,
          name,
          slug,
          description,
          icon,
          type,
          member_count,
          created_at
        )
      `)
      .eq('user_id', user.id);

    const normalizeMembershipRows = (rows: Array<{ communities: Community | Community[] | null }>) => rows
      .flatMap(item => {
        if (!item.communities) return [];
        return Array.isArray(item.communities) ? item.communities : [item.communities];
      })
      .sort((a, b) => b.member_count - a.member_count);

    let communities = (membershipData ?? [])
      .length > 0
      ? normalizeMembershipRows(membershipData as Array<{ communities: Community | Community[] | null }>)
      : [];

    // Existing users may not have been backfilled into community_members.
    // Bootstrap them into their communities so the sidebar is never empty.
    if (communities.length === 0) {
      const yearSlug = profile?.year ? `year-${profile.year}` : null;
      const branchSlug = profile?.branch?.toLowerCase() ?? null;
      const sectionSlug = profile?.branch && profile?.section
        ? `${profile.branch.toLowerCase()}-${profile.section.toLowerCase()}`
        : null;
      
      let autoSlugs = ['campus', yearSlug, branchSlug].filter(Boolean) as string[];
      
      // Only add section community for branches that have multiple sections
      const multiSectionBranches = ['CSE', 'ECE'];
      if (profile?.branch && multiSectionBranches.includes(profile.branch) && sectionSlug) {
        autoSlugs.push(sectionSlug);
      }
      
      const { data: existingCommunities } = await supabase
        .from('communities')
        .select('slug')
        .in('slug', autoSlugs);
      const existingSlugSet = new Set((existingCommunities ?? []).map(c => c.slug));

      for (const slug of autoSlugs) {
        if (!existingSlugSet.has(slug)) continue;
        await ensureMembership(supabase, user.id, slug);
      }

      const { data: bootstrappedData } = await supabase
        .from('community_members')
        .select(`
          communities (
            id,
            name,
            slug,
            description,
            icon,
            type,
            member_count,
            created_at
          )
        `)
        .eq('user_id', user.id);

      communities = (bootstrappedData ?? [])
        .length > 0
        ? normalizeMembershipRows(bootstrappedData as Array<{ communities: Community | Community[] | null }>)
        : [];
    }

    const allJoined = profile?.is_anonymous
      ? communities.filter(c => ['campus', 'confessions', 'rants'].includes(c.slug))
      : communities;

    const yearSlug = profile?.year ? `year-${profile.year.replace(/\D/g, '') || profile.year.toLowerCase()}` : null;
    const branchSlug = profile?.branch?.toLowerCase() ?? null;
    const sectionSlug = profile?.branch && profile?.section
      ? `${profile.branch.toLowerCase()}-${profile.section.toLowerCase()}`
      : null;
    const mySlugSet = new Set(['campus', yearSlug, branchSlug, sectionSlug].filter(Boolean) as string[]);

    const mine = allJoined
      .filter(c => mySlugSet.has(c.slug))
      .sort((a, b) => b.member_count - a.member_count);
    const joined = allJoined
      .filter(c => !mySlugSet.has(c.slug))
      .sort((a, b) => b.member_count - a.member_count);

    const { data: openCommunities } = await supabase
      .from('communities')
      .select('id,name,slug,description,icon,type,member_count,created_at')
      .eq('type', 'open')
      .order('member_count', { ascending: false });

    const joinedSlugSet = new Set(allJoined.map(c => c.slug));
    const explore = (openCommunities ?? []).filter(c => !joinedSlugSet.has(c.slug));

    setMyCommunities(mine);
    setJoinedCommunities(joined);
    setExploreCommunities(explore as Community[]);
  }, [supabase]);

  useEffect(() => {
    fetchJoinedCommunities();
  }, [fetchJoinedCommunities]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-[#111] border-r border-gray-800/60 fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="p-5 border-b border-gray-800/60">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <div>
            <span className="text-white font-bold text-base">CICS</span>
            <p className="text-gray-500 text-[10px] leading-none">College Chat</p>
          </div>
        </Link>
      </div>

      {/* Rooms */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
        <p className="text-gray-600 text-[10px] uppercase tracking-widest px-3 py-2">My Communities</p>
        {myCommunities.map(renderCommunityLink)}

        <p className="text-gray-600 text-[10px] uppercase tracking-widest px-3 py-2 mt-2">Joined</p>
        {joinedCommunities.map(renderCommunityLink)}

        <p className="text-gray-600 text-[10px] uppercase tracking-widest px-3 py-2 mt-2">Explore</p>
        {exploreCommunities.map(renderCommunityLink)}
      </nav>

      {/* Bottom links */}
      <div className="p-3 border-t border-gray-800/60 space-y-1">
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
            pathname === '/profile'
              ? 'bg-indigo-600/20 text-indigo-400 font-medium'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
          }`}
        >
          <span className="text-base">👤</span>
          <span>My Profile</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition-colors w-full text-left"
        >
          <span className="text-base">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
