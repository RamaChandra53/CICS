'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { ensureUniquePseudoUsername } from '@/lib/usernameGenerator';

const PROFILE_SELECT =
  'id, username, full_name, roll_number, year, branch, section, is_first_login, is_verified, is_anonymous, id_card_url, email, college_email, is_email_verified, real_display_name, pseudo_username, pending_pseudo_username, pseudo_username_status, pseudo_username_requested_at, pseudo_username_rejection_reason, pseudo_username_last_changed_at, show_roll_number_publicly';

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

/**
 * If the profile has no pseudo_username, generate one and persist it.
 * This handles existing users who were created before the identity v4 migration.
 */
async function backfillPseudoUsername(
  supabase: ReturnType<typeof createClient>,
  profile: Profile
): Promise<Profile> {
  if (profile.pseudo_username) {
    return profile;
  }

  try {
    const pseudoUsername = await ensureUniquePseudoUsername(supabase);

    const { error } = await supabase
      .from('profiles')
      .update({
        pseudo_username: pseudoUsername,
        pseudo_username_status: 'approved',
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Failed to backfill pseudo_username:', error);
      return profile;
    }

    return {
      ...profile,
      pseudo_username: pseudoUsername,
      pseudo_username_status: 'approved' as const,
    };
  } catch (err) {
    console.error('Error during pseudo_username backfill:', err);
    return profile;
  }
}

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

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timeoutId: number | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  };

  const isAuthLockError = (value: unknown) => {
    if (!value) return false;
    const message = value instanceof Error ? value.message : String((value as { message?: unknown }).message ?? value);
    return message.includes('lock:') || message.includes('NavigatorLockAcquireTimeoutError');
  };

  const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  const fetchProfile = async (userId: string, options?: { background?: boolean }): Promise<Profile | null> => {
    if (!options?.background) {
      setProfileLoading(true);
      setError(null);
      setErrorScope(null);
    }
    try {
      let profileResult:
        | { data: Profile | null; error: { message?: string } | null }
        | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          profileResult = await withTimeout<{
            data: Profile | null;
            error: { message?: string } | null;
          }>(
            supabase
              .from('profiles')
              .select(PROFILE_SELECT)
              .eq('id', userId)
              .single() as Promise<{ data: Profile | null; error: { message?: string } | null }>,
            15000,
            'Profile request timed out'
          );
          break;
        } catch (fetchError) {
          if (!isAuthLockError(fetchError) && attempt === 2) {
            throw fetchError;
          }
          if (attempt < 2) {
            await delay(400 * (attempt + 1));
          }
        }
      }

      if (!profileResult) {
        throw new Error('Profile request failed');
      }

      const { data: profileData, error: profileError } = profileResult;

      if (profileError) {
        throw profileError;
      }

      if (!profileData) return null;

      // Backfill pseudo_username if missing
      const finalProfile = await backfillPseudoUsername(supabase, profileData as Profile);
      return finalProfile;
    } catch (fetchError) {
      console.error('Profile fetch error:', fetchError);
      if (!options?.background) {
        setError('Unable to load your profile. Please try again.');
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
