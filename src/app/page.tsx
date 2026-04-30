'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { BRANCHES, YEARS, SECTIONS } from '@/types';

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

function normalizeYearForSlug(year: string) {
  const digits = year.replace(/\D/g, '');
  return digits || year.trim().toLowerCase().replace(/\s+/g, '-');
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');

  const isFirstTimeAttempt = password === DEFAULT_PASSWORD;

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
      if (isFirstTimeAttempt && (!year || !branch || !section)) {
        throw new Error('Year, branch, and section are required for first-time login.');
      }

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

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: DEFAULT_PASSWORD,
          options: {
            data: {
              roll_number: normalizedRollNumber,
              is_first_login: true,
              year,
              branch,
              section,
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
        profilePayload.year = year;
        profilePayload.branch = branch;
        profilePayload.section = section;
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
        const normalizedBranch = branch.trim().toLowerCase();
        const normalizedSection = section.trim().toLowerCase();
        const normalizedYear = normalizeYearForSlug(year);

        const communityRows = [
          {
            name: `Year ${normalizedYear.toUpperCase()}`,
            slug: `year-${normalizedYear}`,
            description: 'Students in your year',
            icon: '📅',
            type: 'auto',
          },
          {
            name: normalizedBranch.toUpperCase(),
            slug: normalizedBranch,
            description: 'Students in your branch',
            icon: '🎓',
            type: 'auto',
          },
          {
            name: `${normalizedBranch.toUpperCase()}-${normalizedSection.toUpperCase()}-${normalizedYear.toUpperCase()}`,
            slug: `${normalizedBranch}-${normalizedSection}-${normalizedYear}`,
            description: 'Your class section',
            icon: '👥',
            type: 'auto',
          },
        ];

        await supabase.from('communities').upsert(communityRows, { onConflict: 'slug' });
        await supabase.from('community_members').upsert(
          [
            { user_id: userId, community_slug: 'campus' },
            { user_id: userId, community_slug: `year-${normalizedYear}` },
            { user_id: userId, community_slug: normalizedBranch },
            { user_id: userId, community_slug: `${normalizedBranch}-${normalizedSection}-${normalizedYear}` },
          ],
          { onConflict: 'user_id,community_slug' }
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
              onChange={e => setRollNumber(e.target.value)}
              placeholder="e.g. 21CSE042"
              className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
              required
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
                First-time login detected. Fill these details to continue.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Year</label>
                  <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                    required={isFirstTimeAttempt}
                  >
                    <option value="">Year</option>
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Branch</label>
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                    required={isFirstTimeAttempt}
                  >
                    <option value="">Branch</option>
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Section</label>
                  <select
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                    required={isFirstTimeAttempt}
                  >
                    <option value="">Section</option>
                    {SECTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 text-center mt-4">
          First-time password: <span className="text-gray-300">{DEFAULT_PASSWORD}</span>
        </p>
      </div>
    </div>
  );
}
