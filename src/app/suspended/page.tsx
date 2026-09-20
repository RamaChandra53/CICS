'use client';

import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function SuspendedPage() {
  const params = useSearchParams();
  const kind = params.get('kind') === 'mute' ? 'muted' : 'suspended';
  const signOut = async () => { await createClient().auth.signOut(); window.location.href = '/'; };

  return <main className="flex min-h-screen items-center justify-center bg-[#090b12] px-4 text-slate-100"><section className="w-full max-w-md rounded-3xl border border-rose-300/15 bg-white/[0.035] p-7 text-center shadow-2xl shadow-black/30"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-400/15 text-2xl text-rose-200">!</div><p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-rose-300">CICS moderation</p><h1 className="mt-2 font-display text-2xl font-bold text-white">Your account is {kind}</h1><p className="mt-3 text-sm leading-6 text-slate-400">You can&apos;t access the campus network while this moderation action is active. If you think this was a mistake, contact your campus moderators.</p><button onClick={signOut} className="mt-6 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-rose-100">Sign out</button></section></main>;
}
