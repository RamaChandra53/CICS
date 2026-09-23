'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/Toast';
import RouteProgress from '@/components/RouteProgress';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    user,
    session,
    profile,
    loading,
    profileLoading,
    error,
    errorScope,
    reloadAuth,
  } = useAuth();
  const mobileHeaderOffset = 'pt-12';
  const mobileNavOffset = 'pb-24';
  const [showTimeout, setShowTimeout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading || profileLoading) {
      setShowTimeout(false);
      const timeoutId = window.setTimeout(() => {
        setShowTimeout(true);
      }, 10000);
      return () => window.clearTimeout(timeoutId);
    }

    setShowTimeout(false);
    return undefined;
  }, [loading, profileLoading]);

  const hasAuthSettled = useRef(false);

  useEffect(() => {
    if (loading || profileLoading) {
      // Auth is still in progress — don't mark as settled yet
      return;
    }
    // Mark settled on the NEXT tick so React finishes batching state updates
    const id = window.setTimeout(() => {
      hasAuthSettled.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, [loading, profileLoading]);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (error && errorScope === 'session') return;

    // Don't redirect until auth has truly settled (avoids firing on transient null state)
    if (!hasAuthSettled.current) return;

    if (!user || !session) {
      router.replace('/');
      return;
    }

    if (profile?.is_first_login) {
      router.replace('/set-password');
      return;
    }
  }, [user, session, profile, loading, profileLoading, error, errorScope, router]);

  const shouldBlockForAuth = (loading && !session) || (profileLoading && !profile);

  if (shouldBlockForAuth) {
    return (
      <div className="min-h-screen bg-[#0b0f12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400 text-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p>Loading your campus feed...</p>
          {showTimeout && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">Still loading. Try refreshing.</p>
              <button
                onClick={() => reloadAuth()}
                className="h-9 rounded-lg border border-[#252a31] px-4 text-xs text-slate-300 transition-colors hover:text-white"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && errorScope === 'session') {
    return (
      <div className="min-h-screen bg-[#0b0f12] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-red-800/40 bg-red-900/20 p-6 text-center max-w-sm w-full">
          <h2 className="mb-2 text-base font-semibold text-red-200">Couldn&apos;t load your session</h2>
          <p className="mb-4 text-xs text-red-300">{error}</p>
          <button
            onClick={() => reloadAuth()}
            className="h-10 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const initials = profile?.username?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="min-h-screen bg-[#0b0f12] text-slate-100 overflow-x-hidden">
      <RouteProgress />
      <Sidebar />
      <MobileMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <header className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-[#252a31] bg-[#0b0f12]">
        <div className="flex h-12 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#252a31] bg-[#15181c] text-slate-300 transition-colors hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 7h14M5 12h14M5 17h14" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              aria-label="Profile"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200"
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>

      <main className={`md:ml-60 ${mobileNavOffset} md:pb-0 ${mobileHeaderOffset} md:pt-0 min-h-screen`}>
        {error && errorScope === 'profile' && (
          <div className="mx-3 mt-3 rounded-xl border border-yellow-800/40 bg-yellow-900/20 px-4 py-3 text-xs text-yellow-300 md:mx-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <button
                onClick={() => reloadAuth()}
                className="h-8 rounded-lg border border-yellow-700/40 px-3 text-[11px] text-yellow-200 transition-colors hover:text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ToastProvider>
    </AuthProvider>
  );
}
