'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { INVALID_ROLL_MESSAGE, parseRollNumber } from '@/lib/parseRoll';

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

async function autoJoinCommunities(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  year: string,
  branch: string,
  section: string
) {
  // Join communities based on user's roll number: campus + year + branch + section (if multi-section)
  const slugs = ['campus', `year-${year}`, branch.toLowerCase()];
  
  // Only add section community for branches that have multiple sections
  const multiSectionBranches = ['CSE', 'ECE'];
  if (multiSectionBranches.includes(branch)) {
    slugs.push(`${branch.toLowerCase()}-${section}`);
  }
  
  const { data: existingCommunities, error: existingCommunitiesError } = await supabase
    .from('communities')
    .select('slug')
    .in('slug', slugs);
  if (existingCommunitiesError) {
    if (isMissingTableError(existingCommunitiesError, 'communities')) {
      // Allow login to continue on instances where communities migration is not yet applied.
      return;
    }
    throw existingCommunitiesError;
  }

  const existingSlugSet = new Set((existingCommunities ?? []).map(c => c.slug));

  for (const slug of slugs) {
    if (!existingSlugSet.has(slug)) continue;
    const { error: memberError } = await supabase
      .from('community_members')
      .upsert({ user_id: userId, community_slug: slug }, { onConflict: 'user_id,community_slug' });
    if (memberError) {
      if (isMissingTableError(memberError, 'community_members')) {
        return;
      }
      throw memberError;
    }
  }
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const isFirstTimeAttempt = password === DEFAULT_PASSWORD;
  const parsedRoll = parseRollNumber(rollNumber);
  const showInvalidRollMessage = isFirstTimeAttempt && rollNumber.trim().length > 0 && !parsedRoll;
  const isSubmitDisabled = loading || (isFirstTimeAttempt && !parsedRoll);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', user.id)
        .single();
      router.replace(profile?.is_first_login ? '/set-password' : '/feed');
    };
    checkSession();
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

      const profilePayload: Record<string, string | boolean> = {
        id: userId,
        username: normalizedRollNumber,
        roll_number: normalizedRollNumber,
        is_anonymous: false,
        is_first_login: isFirstTimeAttempt,
      };
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

      if (isFirstTimeAttempt) {
        const normalizedBranch = parsedRollForSignup!.branch.trim().toLowerCase();
        const normalizedSection = parsedRollForSignup!.section.trim().toLowerCase();
        const normalizedYear = parsedRollForSignup!.yearNumber;
        await autoJoinCommunities(
          supabase,
          userId,
          normalizedYear,
          normalizedBranch,
          normalizedSection
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_first_login')
        .eq('id', userId)
        .single();
      router.push(profile?.is_first_login ? '/set-password' : '/feed');
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
          <h1 className="text-4xl sm:text-5xl font-bold text-white">CICS</h1>
          <p className="text-gray-400 mt-2 text-sm">Login with your roll number</p>
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
              placeholder="e.g. 25261A0512"
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
            <div className="space-y-3 rounded-xl border border-indigo-700/40 bg-indigo-900/10 p-3.5">
              <p className="text-xs text-indigo-300">
                First-time login detected. Year, branch, and section are auto-detected from roll number.
              </p>
              <div className="space-y-1.5 text-sm">
                <p className="text-gray-300">
                  Year: <span className="text-white font-medium">{parsedRoll ? `${parsedRoll.year} Year` : '-'}</span>
                </p>
                <p className="text-gray-300">
                  Branch: <span className="text-white font-medium">{parsedRoll?.branch ?? '-'}</span>
                </p>
                <p className="text-gray-300">
                  Section: <span className="text-white font-medium">{parsedRoll?.section ?? '-'}</span>
                </p>
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
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 text-center mt-4">
          First-time password: <span className="text-gray-300">{DEFAULT_PASSWORD}</span>
        </p>

        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/forgot-password')}
            className="text-[#6366f1] hover:text-[#4f46e5] text-sm transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
