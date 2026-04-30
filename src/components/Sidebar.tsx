'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Community } from '@/types';
import { createClient } from '@/lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);

  const fetchJoinedCommunities = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_anonymous')
      .eq('id', user.id)
      .maybeSingle();

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

    let communities = (membershipData ?? [])
      .flatMap((item: { communities: Community[] | null }) => item.communities ?? [])
      .sort((a, b) => b.member_count - a.member_count);

    // Existing users may not have been backfilled into community_members.
    // Bootstrap them into campus so the sidebar is never empty.
    if (communities.length === 0) {
      await supabase
        .from('community_members')
        .upsert({ user_id: user.id, community_slug: 'campus' }, { onConflict: 'user_id,community_slug' });

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
        .flatMap((item: { communities: Community[] | null }) => item.communities ?? [])
        .sort((a, b) => b.member_count - a.member_count);
    }

    const filtered = profile?.is_anonymous
      ? communities.filter(c => ['campus', 'confessions', 'rants'].includes(c.slug))
      : communities;

    setJoinedCommunities(filtered);
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
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-gray-600 text-[10px] uppercase tracking-widest px-3 py-2">Communities</p>
        {joinedCommunities.map(community => {
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
        })}
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
