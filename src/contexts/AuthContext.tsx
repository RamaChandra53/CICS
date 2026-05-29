'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { ensureUniquePseudoUsername } from '@/lib/usernameGenerator';

const PROFILE_SELECT =
  'id, username, full_name, roll_number, year, branch, section, is_first_login, is_verified, is_anonymous, id_card_url, email, college_email, is_email_verified, real_display_name, pseudo_username, pending_pseudo_username, pseudo_username_status, pseudo_username_requested_at, pseudo_username_rejection_reason, pseudo_username_last_changed_at, show_roll_number_publicly';

interface AuthContextType {
  user: { id: string } | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .single();

    if (!profileData) return null;

    // Backfill pseudo_username if missing
    const finalProfile = await backfillPseudoUsername(supabase, profileData as Profile);
    return finalProfile;
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        // Handle refresh token errors gracefully
        if (error && error.message?.includes('Refresh Token Not Found')) {
          console.warn('Session expired, clearing auth state');
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        if (user) {
          setUser(user);
          const profileData = await fetchProfile(user.id);
          if (mounted && profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear auth state on any auth error
        if (error instanceof Error && error.message.includes('Refresh Token')) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          if (mounted) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
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
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    if (profileData) {
      setProfile(profileData);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
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
