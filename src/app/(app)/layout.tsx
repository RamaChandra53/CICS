'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/Toast';
import RouteProgress from '@/components/RouteProgress';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
  const hasHomeHeader = pathname === '/feed';
  const mobileHeaderOffset = hasHomeHeader ? 'pt-12' : 'pt-0';
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-muted text-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p>Loading your campus feed...</p>
          {showTimeout && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">Still loading. Try refreshing.</p>
              <button
                onClick={() => reloadAuth()}
                className="h-9 rounded-lg border border-border-primary px-4 text-xs text-text-secondary transition-colors hover:text-text-primary"
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="rounded-2xl border border-red-800/40 bg-red-900/20 p-6 text-center max-w-sm w-full">
          <h2 className="mb-2 text-base font-semibold text-red-200">Couldn&apos;t load your session</h2>
          <p className="mb-4 text-xs text-red-300">{error}</p>
          <button
            onClick={() => reloadAuth()}
            className="h-10 w-full rounded-lg bg-accent-primary text-sm font-semibold text-white transition-colors hover:bg-accent-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">
      <RouteProgress />
      <Sidebar />
      <MobileMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {hasHomeHeader && (
        <header className="md:hidden fixed top-0 left-0 right-0 z-30 border-b border-border-primary bg-bg-secondary">
          <div className="flex h-12 items-center justify-between px-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center text-text-secondary"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => router.push('/notifications')}
              aria-label="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center text-text-secondary"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </button>
          </div>
        </header>
      )}

      <main className={`min-w-0 max-w-full md:ml-60 ${mobileNavOffset} md:pb-0 ${mobileHeaderOffset} md:pt-0 min-h-screen`}>
        {error && errorScope === 'profile' && (
          <div className="mx-3 mt-3 rounded-xl border border-yellow-800/40 bg-yellow-900/20 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300 md:mx-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              <button
                onClick={() => reloadAuth()}
                className="h-8 rounded-lg border border-yellow-700/40 px-3 text-[11px] text-yellow-700 transition-colors hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-white"
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
      <ThemeProvider>
        <ToastProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
