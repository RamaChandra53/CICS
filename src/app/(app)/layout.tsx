'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const mobileHeaderOffset = 'pt-12';
  const mobileNavOffset = 'pb-24';

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/');
        return;
      }

      if (profile?.is_first_login) {
        router.replace('/set-password');
        return;
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f12] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const initials = profile?.username?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="min-h-screen bg-[#0b0f12] text-slate-100 overflow-x-hidden">
      <Sidebar />

      <header className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-[#252a31] bg-[#0b0f12]">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/feed" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
              C
            </span>
            CICS
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200"
          >
            {initials}
          </Link>
        </div>
      </header>

      <main className={`md:ml-60 ${mobileNavOffset} md:pb-0 ${mobileHeaderOffset} md:pt-0 min-h-screen`}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
