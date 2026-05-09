'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { INVALID_ROLL_MESSAGE, parseRollNumber, getCurrentYear } from '@/lib/parseRoll';

const DEFAULT_PASSWORD = 'cics@123';

function toInternalEmail(rollNumber: string) {
  return `${rollNumber.trim().toUpperCase()}@cics.local`;
}

function getReadableErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return 'Something went wrong. Please try again.';
}

function isMissingTableError(err: { message?: string | null; code?: string | null }, tableName: string) {
  const message = (err.message ?? '').toLowerCase();
  return (
    err.code === 'PGRST205' ||
    message.includes(`could not find the table 'public.${tableName}'`) ||
    message.includes(`relation "public.${tableName}" does not exist`) ||
    message.includes(`relation "${tableName}" does not exist`)
  );
}

async function updateDynamicCommunities(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rollNumber: string
) {
  type CommunityMembership = { community_slug: string };
  type CommunitySlugRecord = { slug: string };

  // Calculate current year dynamically
  const currentYear = getCurrentYear(rollNumber);
  const isAlumni = currentYear === 'Alumni';
  
  // Get current community memberships
  const { data: currentMemberships, error: membershipError } = await supabase
    .from('community_members')
    .select('community_slug')
    .eq('user_id', userId);
    
  if (membershipError) {
    if (isMissingTableError(membershipError, 'community_members')) {
      return;
    }
    throw membershipError;
  }

  const currentSlugs = new Set(
    ((currentMemberships ?? []) as CommunityMembership[]).map((membership) => membership.community_slug)
  );
  
  // Determine target communities - Reddit-style 5 core subreddits
  const targetSlugs: string[] = ['campus']; // Everyone joins campus
  
  // Add specific communities based on user type
  if (isAlumni) {
    targetSlugs.push('alumni');
  } else {
    // All current students join placements and clubs
    targetSlugs.push('placements', 'clubs');
  }
  
  // Everyone can join confessions (anonymous-only community)
  targetSlugs.push('confessions');

  // Remove old year/section communities and add new ones
  const toRemove: string[] = [];
  const toAdd: string[] = [];

  // Check which communities to remove - only keep 5 core subreddits
  const coreSubreddits = ['campus', 'confessions', 'placements', 'clubs', 'alumni'];
  for (const slug of currentSlugs) {
    if (!coreSubreddits.includes(slug)) {
      toRemove.push(slug);
    }
  }

  // Check which communities to add
  for (const slug of targetSlugs) {
    if (!currentSlugs.has(slug)) {
      toAdd.push(slug);
    }
  }

  // Remove old communities
  for (const slug of toRemove) {
    const { error: removeError } = await supabase
      .from('community_members')
      .delete()
      .eq('user_id', userId)
      .eq('community_slug', slug);
    if (removeError && !isMissingTableError(removeError, 'community_members')) {
      throw removeError;
    }
  }

  // Add new communities
  const { data: existingCommunities, error: existingCommunitiesError } = await supabase
    .from('communities')
    .select('slug')
    .in('slug', toAdd);
    
  if (existingCommunitiesError) {
    if (isMissingTableError(existingCommunitiesError, 'communities')) {
      return;
    }
    throw existingCommunitiesError;
  }

  const existingSlugSet = new Set(
    ((existingCommunities ?? []) as CommunitySlugRecord[]).map((community) => community.slug)
  );

  for (const slug of toAdd) {
    if (!existingSlugSet.has(slug)) continue;
    const { error: memberError } = await supabase
      .from('community_members')
      .upsert({ user_id: userId, community_slug: slug }, { onConflict: 'user_id,community_slug' });
    if (memberError && !isMissingTableError(memberError, 'community_members')) {
      throw memberError;
    }
  }
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const isFirstTimeAttempt = password === DEFAULT_PASSWORD;
  const parsedRoll = parseRollNumber(rollNumber);
  const showInvalidRollMessage = isFirstTimeAttempt && rollNumber.trim().length > 0 && !parsedRoll;
  const isSubmitDisabled = loading || (isFirstTimeAttempt && !parsedRoll);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', user.id)
        .single();
      if (!cancelled) {
        router.replace(profile?.is_first_login ? '/set-password' : '/feed');
      }
    };
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedRollNumber = rollNumber.trim().toUpperCase();
      if (!normalizedRollNumber || !password) {
        throw new Error('Please enter roll number and password.');
      }
      if (isFirstTimeAttempt && !parsedRoll) {
        throw new Error(INVALID_ROLL_MESSAGE);
      }
      const parsedRollForSignup = parsedRoll;

      const email = toInternalEmail(normalizedRollNumber);
      let userId: string | null = null;
      let createdNewAccount = false;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (!isFirstTimeAttempt) {
          throw new Error('Invalid roll number or password.');
        }

        const { data: existingRollProfile, error: existingRollError } = await supabase
          .from('profiles')
          .select('id')
          .eq('roll_number', normalizedRollNumber)
          .maybeSingle();
        if (existingRollError) throw existingRollError;
        if (existingRollProfile) {
          throw new Error('This roll number is already registered. Try logging in instead.');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: DEFAULT_PASSWORD,
          options: {
            data: {
              roll_number: normalizedRollNumber,
              is_first_login: true,
              year: parsedRollForSignup!.year,
              branch: parsedRollForSignup!.branch,
              section: parsedRollForSignup!.section,
            },
          },
        });
        if (signUpError) {
          throw new Error('Invalid roll number or password.');
        }
        createdNewAccount = true;

        if (!signUpData.session) {
          const { data: fallbackSignIn, error: fallbackSignInError } = await supabase.auth.signInWithPassword({
            email,
            password: DEFAULT_PASSWORD,
          });
          if (fallbackSignInError || !fallbackSignIn.user) {
            throw new Error('Unable to start your session. Please try again.');
          }
          userId = fallbackSignIn.user.id;
        } else {
          userId = signUpData.user?.id ?? null;
        }
      } else {
        userId = signInData.user?.id ?? null;
      }

      if (!userId) {
        throw new Error('Unable to complete sign in. Please try again.');
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', userId)
        .maybeSingle();
      const existingFirstLoginState = existingProfile?.is_first_login;
      const shouldRequirePasswordReset =
        createdNewAccount ||
        existingFirstLoginState === true ||
        (existingFirstLoginState == null && isFirstTimeAttempt);

      const profilePayload: Record<string, string | boolean> = {
        id: userId,
        username: normalizedRollNumber,
        roll_number: normalizedRollNumber,
        is_anonymous: false,
      };
      if (existingFirstLoginState != null) {
        profilePayload.is_first_login = existingFirstLoginState;
      } else if (createdNewAccount || isFirstTimeAttempt) {
        profilePayload.is_first_login = true;
      }
      if (isFirstTimeAttempt) {
        profilePayload.year = parsedRollForSignup!.year;
        profilePayload.branch = parsedRollForSignup!.branch;
        profilePayload.section = parsedRollForSignup!.section;
      }

      const { error: profileError } = await supabase.from('profiles').upsert(profilePayload);
      if (profileError) {
        if (profileError.message?.includes('is_first_login')) {
          throw new Error(
            'Database schema is missing is_first_login. Run the latest Supabase SQL migration and try again.'
          );
        }
        throw profileError;
      }

      // Update year dynamically on every login
      const currentYear = getCurrentYear(normalizedRollNumber);
      const isAlumni = currentYear === 'Alumni';
      
      // Update profile with current year
      await supabase
        .from('profiles')
        .update({ 
          year: isAlumni ? null : currentYear,
          branch: parsedRollForSignup?.branch,
          section: isAlumni ? null : parsedRollForSignup?.section
        })
        .eq('id', userId);

      // Update community memberships dynamically
      void updateDynamicCommunities(
        supabase,
        userId,
        normalizedRollNumber
      ).catch((communityError) => {
        console.error('Community sync failed:', communityError);
      });

      router.push(shouldRequirePasswordReset ? '/set-password' : '/feed');
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#141414] border border-gray-800 rounded-2xl p-6 sm:p-7">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Anonstud</h1>
          <p className="text-gray-400 mt-2 text-sm">Bonjour!, my friend</p>
          <p className="text-gray-400 text-sm">Stay anon and Have fun</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={e => {
                setRollNumber(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="eg: 25261A0512"
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
              required
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
              required
            />
          </div>

          {isFirstTimeAttempt && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#6366f1]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs font-medium">First-time login detected</p>
              </div>
              <p className="text-xs text-gray-400">
                Your year, branch, and section are auto-detected from your roll number.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#111] rounded-lg p-2">
                  <p className="text-xs text-gray-500">Year</p>
                  <p className="text-sm font-semibold text-white">{parsedRoll ? parsedRoll.year : '-'}</p>
                </div>
                <div className="bg-[#111] rounded-lg p-2">
                  <p className="text-xs text-gray-500">Branch</p>
                  <p className="text-sm font-semibold text-white">{parsedRoll?.branch ?? '-'}</p>
                </div>
                <div className="bg-[#111] rounded-lg p-2">
                  <p className="text-xs text-gray-500">Section</p>
                  <p className="text-sm font-semibold text-white">{parsedRoll?.section ?? '-'}</p>
                </div>
              </div>
            </div>
          )}

          {showInvalidRollMessage && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
              {INVALID_ROLL_MESSAGE}
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : 'Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">
              First time password: <span className="font-mono text-[#6366f1] bg-[#111] px-2 py-1 rounded">{DEFAULT_PASSWORD}</span>
            </p>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => router.push('/forgot-password')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
