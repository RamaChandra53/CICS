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
    <div className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* Atmospheric background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent-muted/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary/80"></div>
      
      {/* Main content */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full glass rounded-3xl p-8 sm:p-10 neon-glow animate-glow">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-accent rounded-2xl mb-6 animate-float">
              <h1 className="text-3xl font-bold text-white neon-text">CICS</h1>
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">Welcome Back</h2>
            <p className="text-text-secondary text-sm">Enter your roll number to access the campus network</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-text-secondary text-xs font-medium mb-2">Roll Number</label>
            <input
              type="text"
              value={rollNumber}
              onChange={e => {
                setRollNumber(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="e.g. 25261A0512"
              className="input-field font-mono text-sm"
              required
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-text-secondary text-xs font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="input-field text-sm"
              required
            />
          </div>

          {isFirstTimeAttempt && (
            <div className="glass rounded-xl border border-accent-primary/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-accent-primary">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs font-medium">First-time login detected</p>
              </div>
              <p className="text-xs text-text-secondary">
                Your year, branch, and section are auto-detected from your roll number.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-bg-secondary/50 rounded-lg p-2">
                  <p className="text-xs text-text-muted">Year</p>
                  <p className="text-sm font-semibold text-text-primary">{parsedRoll ? parsedRoll.year : '-'}</p>
                </div>
                <div className="bg-bg-secondary/50 rounded-lg p-2">
                  <p className="text-xs text-text-muted">Branch</p>
                  <p className="text-sm font-semibold text-text-primary">{parsedRoll?.branch ?? '-'}</p>
                </div>
                <div className="bg-bg-secondary/50 rounded-lg p-2">
                  <p className="text-xs text-text-muted">Section</p>
                  <p className="text-sm font-semibold text-text-primary">{parsedRoll?.section ?? '-'}</p>
                </div>
              </div>
            </div>
          )}

          {showInvalidRollMessage && (
            <div className="glass rounded-xl border border-error/30 p-3">
              <p className="text-error text-sm">{INVALID_ROLL_MESSAGE}</p>
            </div>
          )}

          {error && (
            <div className="glass rounded-xl border border-error/30 p-3">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="btn-primary w-full font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </span>
            ) : 'Access Campus Network'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border-primary space-y-3">
          <div className="text-center">
            <p className="text-xs text-text-muted">
              Default password: <span className="font-mono text-accent-primary bg-bg-secondary/30 px-2 py-1 rounded">{DEFAULT_PASSWORD}</span>
            </p>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => router.push('/forgot-password')}
              className="text-accent-primary hover:text-accent-secondary text-sm font-medium transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Forgot password?
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
