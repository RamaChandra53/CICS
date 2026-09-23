'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CommunitySummary } from '@/types/domain';
import { clearCommunityCaches, fetchClubs } from '@/lib/services/communities';

export default function ClubsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [clubs, setClubs] = useState<CommunitySummary[]>([]);
  const [memberships, setMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadClubs = useCallback(async () => {
    setClubs(await fetchClubs(supabase));
  }, [supabase]);

  const loadMemberships = useCallback(async () => {
    if (!user) return;

    const { data, error: membershipError } = await supabase
      .from('community_members')
      .select('community_slug')
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('Error loading club memberships:', membershipError);
      return;
    }

    setMemberships(new Set((data ?? []).map((row: { community_slug: string }) => row.community_slug)));
  }, [supabase, user]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadClubs(), loadMemberships()]);
      setLoading(false);
    };

    init();
  }, [loadClubs, loadMemberships]);

  const handleJoinLeave = async (clubSlug: string) => {
    if (!user || joinLoading) return;

    setJoinLoading(clubSlug);
    setError('');
    const isMember = memberships.has(clubSlug);

    try {
      if (isMember) {
        const { error: leaveError } = await supabase
          .from('community_members')
          .delete()
          .eq('user_id', user.id)
          .eq('community_slug', clubSlug);

        if (leaveError) throw leaveError;

        setMemberships((prev) => {
          const next = new Set(prev);
          next.delete(clubSlug);
          return next;
        });
      } else {
        const { error: joinError } = await supabase
          .from('community_members')
          .insert({ user_id: user.id, community_slug: clubSlug });

        if (joinError) throw joinError;

        setMemberships((prev) => new Set(prev).add(clubSlug));
      }

      clearCommunityCaches(user.id);
      await loadClubs();
    } catch (err) {
      console.error('Error updating club membership:', err);
      setError(err instanceof Error ? err.message : 'Unable to update club membership.');
    } finally {
      setJoinLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-4 md:px-6 md:py-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="animate-pulse rounded-2xl border border-[#252a31] bg-[#15181c] p-4">
              <div className="h-4 w-1/3 rounded bg-[#1f2329]" />
              <div className="mt-3 h-3 w-2/3 rounded bg-[#1f2329]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 md:px-6 md:py-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
          Open to everyone
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Clubs</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Join any official MGIT club and open its page for posts, updates, and discussions.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {clubs.map((club) => {
          const isMember = memberships.has(club.slug);
          return (
            <div key={club.slug} className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4">
              <Link href={`/room/${club.slug}`} className="block hover:opacity-90">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1f2329] text-2xl">
                    {club.icon ?? '🎯'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white">{club.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">r/{club.slug}</p>
                  </div>
                </div>
                {club.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                    {club.description}
                  </p>
                )}
              </Link>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {club.member_count} member{club.member_count === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => handleJoinLeave(club.slug)}
                  disabled={joinLoading === club.slug}
                  className={`h-9 rounded-full px-4 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isMember
                      ? 'border border-[#252a31] text-slate-300 hover:border-red-800/40 hover:text-red-300'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {joinLoading === club.slug ? '...' : isMember ? 'Joined' : 'Join'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
