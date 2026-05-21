'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';

const PROFILE_SELECT =
  'id, username, full_name, roll_number, year, branch, section, is_first_login, is_verified, is_anonymous, id_card_url, email, is_email_verified';

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Handle auth errors gracefully
      if (authError) {
        console.warn('Auth error in ProfileContext:', authError);
        if (authError.message?.includes('Refresh Token') || authError.message?.includes('lock')) {
          console.log('Clearing auth state due to token conflict');
          await supabase.auth.signOut();
          setProfile(null);
        }
        setLoading(false);
        return;
      }
      
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
        } else if (profileData) {
          setProfile(profileData as Profile);
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      // Clear auth state on unexpected errors
      await supabase.auth.signOut();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
