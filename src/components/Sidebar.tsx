'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const links: { href: string; label: string; icon: string; badge?: string }[] = [
  { href: '/feed', label: 'Feed', icon: '⌂' },
  { href: '/messages', label: 'Messages', icon: '◌' },
  { href: '/feed?view=spaces', label: 'Spaces', icon: '✦' },
  { href: '/search', label: 'Explore', icon: '⌕' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  useEffect(() => {
    if (!user) return;
    fetch('/api/moderation/me').then((response) => response.json()).then((data) => setIsModerator(Boolean(data.isModerator))).catch(() => setIsModerator(false));
  }, [user]);
  const signOut = async () => { await createClient().auth.signOut(); router.push('/'); };
  return <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-white/8 bg-[#090b12] px-4 py-7 md:flex">
    <Link href="/feed" className="mb-12 flex items-center gap-3 px-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-300 text-lg font-black text-slate-950">C</span><span><span className="block font-display text-lg font-bold tracking-tight text-white">cics</span><span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">campus pulse</span></span></Link>
    <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Your space</p>
    <nav className="space-y-1">{links.map((link) => { const active = pathname === link.href || (link.href === '/feed' && pathname === '/'); return <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${active ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg ${active ? 'bg-cyan-300 text-slate-950' : 'bg-white/5 text-slate-400'}`}>{link.icon}</span><span className="flex-1">{link.label}</span>{link.badge && <span className="rounded-full bg-cyan-300 px-1.5 py-0.5 text-[10px] font-black text-slate-950">{link.badge}</span>}</Link>; })}</nav>
    <div className="mt-auto space-y-1 border-t border-white/8 pt-4"><Link href="/profile" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white/5 hover:text-slate-200"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200">◎</span><span>Profile & identity</span></Link>{isModerator && <Link href="/admin/reports" className="flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 px-3 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-300/15">⚑</span><span>Moderation console</span></Link>}<button onClick={signOut} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">↗</span><span>Sign out</span></button></div>
  </aside>;
}
