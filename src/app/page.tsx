'use client';



import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { INVALID_ROLL_MESSAGE, parseRollNumber, getCurrentYear } from '@/lib/parseRoll';

function toInternalEmail(rollNumber: string) {
  return `${rollNumber.trim().toUpperCase()}@cics.local`;
}

function toLegacyUsernameEmail(username: string) {
  return `${username.trim().toLowerCase()}@cics.local`;
}

function looksLikeRollNumber(value: string) {
  return /^[A-Za-z0-9]{10}$/.test(value.trim());
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

async function getSignInEmailCandidates(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  normalizedUpperIdentifier: string
) {
  type ProfileLoginRecord = { username: string | null; roll_number: string | null; email: string | null };
  const candidates = new Set<string>();
  const trimmedIdentifier = identifier.trim();
  const loweredIdentifier = trimmedIdentifier.toLowerCase();

  if (trimmedIdentifier.includes('@')) {
    candidates.add(loweredIdentifier);
  } else {
    candidates.add(toInternalEmail(normalizedUpperIdentifier));
    candidates.add(toLegacyUsernameEmail(trimmedIdentifier));
  }

  const profileRecords = new Map<string, ProfileLoginRecord>();
  const profileQueries: Array<Promise<{ data: ProfileLoginRecord[] | null }>> = [
    supabase
      .from('profiles')
      .select('username, roll_number, email')
      .eq('username', trimmedIdentifier),
    supabase
      .from('profiles')
      .select('username, roll_number, email')
      .eq('roll_number', normalizedUpperIdentifier),
    supabase
      .from('profiles')
      .select('username, roll_number, email')
      .eq('email', loweredIdentifier),
  ];

  const profileResults = await Promise.all(profileQueries);
  for (const result of profileResults) {
    for (const profile of result.data ?? []) {
      const dedupeKey = `${profile.username ?? ''}|${profile.roll_number ?? ''}|${profile.email ?? ''}`;
      profileRecords.set(dedupeKey, profile);
    }
  }

  for (const profile of profileRecords.values()) {
    if (profile.email) {
      candidates.add(profile.email.toLowerCase());
    }
    if (profile.roll_number) {
      candidates.add(toInternalEmail(profile.roll_number));
    }
    if (profile.username) {
      candidates.add(toLegacyUsernameEmail(profile.username));
    }
  }

  return Array.from(candidates);
}

/**
 * Check if the given password is the default password via server-side API.
 * This ensures the default password is never embedded in the client bundle.
 */
async function checkIsDefaultPassword(password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check-default-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) return false;
    const { isDefault } = await response.json();
    return isDefault === true;
  } catch {
    return false;
  }
}

/**
 * Attempt first-time signup via the server-side API.
 * Returns the new user ID if successful.
 */
async function attemptFirstLogin(rollNumber: string): Promise<{ userId: string }> {
  const response = await fetch('/api/auth/first-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create account.');
  }

  return { userId: result.userId };
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const normalizedIdentifier = rollNumber.trim();
  const parsedRoll = parseRollNumber(normalizedIdentifier);
  const isRollLikeInput = looksLikeRollNumber(normalizedIdentifier);
  const isFirstTimeAttempt = isDefaultPassword && parsedRoll !== null;
  const shouldValidateRollForDefaultPassword = isDefaultPassword && isRollLikeInput;
  const showInvalidRollMessage = shouldValidateRollForDefaultPassword && normalizedIdentifier.length > 0 && !parsedRoll;
  const isSubmitDisabled = loading || (shouldValidateRollForDefaultPassword && !parsedRoll);

  // Check if password is the default one (server-side check)
  useEffect(() => {
    if (!password) {
      setIsDefaultPassword(false);
      return;
    }

    // Debounce the check
    const timer = setTimeout(async () => {
      const isDefault = await checkIsDefaultPassword(password);
      setIsDefaultPassword(isDefault);
    }, 300);

    return () => clearTimeout(timer);
  }, [password]);

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
      const normalizedUpperIdentifier = rollNumber.trim().toUpperCase();
      if (!normalizedUpperIdentifier || !password) {
        throw new Error('Please enter your roll number, username, or email and password.');
      }
      if (shouldValidateRollForDefaultPassword && !parsedRoll) {
        throw new Error(INVALID_ROLL_MESSAGE);
      }
      const parsedRollForSignup = parsedRoll;

      let userId: string | null = null;
      let createdNewAccount = false;
      let signInSucceeded = false;
      let lastSignInErrorMessage = 'Invalid credentials.';

      const emailCandidates = await getSignInEmailCandidates(
        supabase,
        normalizedIdentifier,
        normalizedUpperIdentifier
      );

      for (const candidateEmail of emailCandidates) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: candidateEmail,
          password,
        });

        if (!signInError && signInData.user) {
          userId = signInData.user.id;
          signInSucceeded = true;
          break;
        }
        if (signInError?.message) {
          lastSignInErrorMessage = signInError.message;
        }
      }

      if (!signInSucceeded) {
        if (!isFirstTimeAttempt) {
          throw new Error('Invalid roll number, username/email, or password.');
        }

        // Use server-side API for first-time login (default password stays on server)
        try {
          const result = await attemptFirstLogin(normalizedUpperIdentifier);
          createdNewAccount = true;

          // Now sign in with the password the user typed (which we confirmed is the default)
          const email = toInternalEmail(normalizedUpperIdentifier);
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError || !signInData.user) {
            throw new Error('Account created but unable to sign in. Please try again.');
          }

          userId = signInData.user.id;
        } catch (firstLoginErr) {
          throw firstLoginErr;
        }
      }

      if (!userId) {
        throw new Error('Unable to complete sign in. Please try again.');
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('is_first_login, roll_number, username')
        .eq('id', userId)
        .maybeSingle();
      const existingFirstLoginState = existingProfile?.is_first_login;
      const inferredFirstLoginState =
        createdNewAccount ||
        existingFirstLoginState === true ||
        (existingFirstLoginState == null && isFirstTimeAttempt);
      const shouldRequirePasswordReset = inferredFirstLoginState;

      const profilePayload: Record<string, string | boolean | null> = {
        id: userId,
        is_anonymous: false,
      };
      // Always include username to satisfy NOT NULL constraint during upsert
      profilePayload.username = existingProfile?.username || normalizedUpperIdentifier;

      if (createdNewAccount || !existingProfile?.roll_number) {
        profilePayload.roll_number = normalizedUpperIdentifier;
      }
      if (existingFirstLoginState != null) {
        profilePayload.is_first_login = existingFirstLoginState;
      } else if (inferredFirstLoginState) {
        profilePayload.is_first_login = true;
      }
      if (isFirstTimeAttempt) {
        profilePayload.year = parsedRollForSignup!.year === 'Alumni' ? null : parsedRollForSignup!.year;
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

      const { data: persistedProfile } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', userId)
        .maybeSingle();
      const finalShouldRequirePasswordReset =
        persistedProfile?.is_first_login ?? shouldRequirePasswordReset;

      // Update year dynamically on login when a valid roll number is available
      const effectiveRollNumber =
        existingProfile?.roll_number ??
        (parsedRoll ? normalizedUpperIdentifier : null);
      const parsedEffectiveRoll = effectiveRollNumber ? parseRollNumber(effectiveRollNumber) : null;
      if (effectiveRollNumber && parsedEffectiveRoll) {
        const currentYear = getCurrentYear(effectiveRollNumber);
        const isAlumni = currentYear === 'Alumni';

        await supabase
          .from('profiles')
          .update({
            year: isAlumni ? null : currentYear,
            branch: parsedEffectiveRoll.branch,
            section: isAlumni ? null : parsedEffectiveRoll.section
          })
          .eq('id', userId);

        // Update community memberships dynamically when roll number is valid
        void updateDynamicCommunities(
          supabase,
          userId,
          effectiveRollNumber
        ).catch((communityError) => {
          console.error('Community sync failed:', communityError);
        });
      }

      router.push(finalShouldRequirePasswordReset ? '/set-password' : '/feed');
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
          <p className="text-gray-500 text-sm">Only MGIT students can enter. You can stay anonymous inside.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={e => {
                setRollNumber(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. 25261A0512"
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
              required
              maxLength={80}
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
              First time logging in? Use your temporary credentials.
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/forgot-password')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
