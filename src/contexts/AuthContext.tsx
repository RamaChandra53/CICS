'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { delay, fetchProfileById, isAuthLockError, isTimeoutError, withTimeout } from '@/lib/services/profile';

interface AuthContextType {
  user: { id: string } | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  error: string | null;
  errorScope: 'session' | 'profile' | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  reloadAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const userRef = useRef<{ id: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<'session' | 'profile' | null>(null);
  const isInitializingRef = useRef(true);
  const authRequestInFlightRef = useRef<Promise<void> | null>(null);

  const fetchProfile = async (userId: string, options?: { background?: boolean }): Promise<Profile | null> => {
    if (!options?.background) {
      setProfileLoading(true);
      setError(null);
      setErrorScope(null);
    }
    try {
      return await fetchProfileById(supabase, userId);
    } catch (fetchError) {
      if (isTimeoutError(fetchError)) {
        console.warn('Profile fetch timed out. Keeping the app shell available for retry.');
      } else {
        console.error('Profile fetch error:', fetchError);
      }
      if (!options?.background) {
        setError(
          isTimeoutError(fetchError)
            ? 'Profile took too long to load. Check your connection and retry.'
            : 'Unable to load your profile. Please try again.'
        );
        setErrorScope('profile');
      }
      return null;
    } finally {
      if (!options?.background) {
        setProfileLoading(false);
      }
    }
  };

  const loadAuthState = async () => {
    if (authRequestInFlightRef.current) {
      await authRequestInFlightRef.current;
      return;
    }

    setLoading(true);
    setError(null);
    setErrorScope(null);
    const requestPromise = (async () => {
      try {
        let sessionResult:
          | { data: { session: Session | null }; error: { message?: string } | null }
          | null = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            sessionResult = await withTimeout<{
              data: { session: Session | null };
              error: { message?: string } | null;
            }>(
              supabase.auth.getSession() as Promise<{
                data: { session: Session | null };
                error: { message?: string } | null;
              }>,
              15000,
              'Session request timed out'
            );
            break;
          } catch (sessionError) {
            if (!isAuthLockError(sessionError) && attempt === 2) {
              throw sessionError;
            }
            if (attempt < 2) {
              await delay(400 * (attempt + 1));
            }
          }
        }

        if (!sessionResult) {
          throw new Error('Session request failed');
        }

        const { data: { session }, error } = sessionResult;

        if (error && error.message?.includes('Refresh Token Not Found')) {
          console.warn('Session expired, clearing auth state');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(session ?? null);
        const currentUser = session?.user ?? null;
        const nextUser = currentUser ? { id: currentUser.id } : null;
        userRef.current = nextUser;
        setUser(nextUser);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (error instanceof Error && error.message.includes('Refresh Token')) {
          await supabase.auth.signOut();
          setSession(null);
          userRef.current = null;
          setUser(null);
          setProfile(null);
        }
        setError('Unable to verify your session. Please try again.');
        setErrorScope('session');
      } finally {
        setLoading(false);
      }
    })();

    authRequestInFlightRef.current = requestPromise;
    await requestPromise;
    authRequestInFlightRef.current = null;
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      await loadAuthState();
      isInitializingRef.current = false;
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        if (isInitializingRef.current) return;
        if (authRequestInFlightRef.current) return;

        const isSignOut = event === 'SIGNED_OUT';
        const isSignIn = event === 'SIGNED_IN';
        const currentUser = session?.user ?? null;
        const previousUser = userRef.current;
        const isSameUser = !!(previousUser && currentUser && previousUser.id === currentUser.id);

        // Only trigger full-screen loading if signing out or signing in from a logged-out state.
        // Tab refocus, token refresh, and background sync should NEVER block the UI or unmount pages.
        const shouldBlockUI = isSignOut || (isSignIn && !previousUser);
        
        if (shouldBlockUI) {
          setLoading(true);
        }
        
        setError(null);
        setErrorScope(null);
        setSession(session ?? null);

        const nextUser = currentUser ? { id: currentUser.id } : null;
        userRef.current = nextUser;
        setUser(nextUser);

        if (currentUser) {
          // If user was already logged in, fetch profile in background without resetting UI
          const profileData = await fetchProfile(currentUser.id, { background: isSameUser || !shouldBlockUI });
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }

        if (shouldBlockUI) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    userRef.current = null;
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
    }
  };

  const reloadAuth = async () => {
    await loadAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        error,
        errorScope,
        signOut,
        refreshProfile,
        reloadAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
