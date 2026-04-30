'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { generateAnonUsername } from '@/lib/utils';
import { BRANCHES, YEARS, SECTIONS } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

<<<<<<< HEAD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
=======
  const [anonLoading, setAnonLoading] = useState(false);
  const [verifiedLoading, setVerifiedLoading] = useState(false);
  const [anonError, setAnonError] = useState('');
  const [verifiedError, setVerifiedError] = useState('');
>>>>>>> c1adbbcf6569d1c772428758d9dbb29b08ba0e9e

  const [mode, setMode] = useState<AuthMode>('choose');
 
  // Verified login form fields
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');


  const handleAnonymous = async () => {
<<<<<<< HEAD
    setLoading(true);
    setError('');

=======
    setAnonLoading(true);
    setAnonError('');
>>>>>>> c1adbbcf6569d1c772428758d9dbb29b08ba0e9e
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;
      if (!signInData.user) throw new Error('Failed to create anonymous session');

      const username = generateAnonUsername();
<<<<<<< HEAD

      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) throw error;
      if (!data.user) throw new Error('Anonymous login failed');
=======
>>>>>>> c1adbbcf6569d1c772428758d9dbb29b08ba0e9e

      const { error: profileError } = await supabase.from('profiles').upsert({
<<<<<<< HEAD
        id: data.user.id,
=======
        id: signInData.user.id,
>>>>>>> c1adbbcf6569d1c772428758d9dbb29b08ba0e9e
        username,
        is_anonymous: true,
        is_verified: false,
      });

      if (profileError) throw profileError;

      router.push('/feed');
<<<<<<< HEAD
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
=======
    } catch (err: unknown) {
      setAnonError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
>>>>>>> c1adbbcf6569d1c772428758d9dbb29b08ba0e9e
    } finally {
      setAnonLoading(false);
    }
  

 return (
  <div>
    {error && <p style={{ color: 'red' }}>{error}</p>}

    <button onClick={handleAnonymous} disabled={loading}>
      {loading ? 'Loading...' : 'Continue Anonymously'}
    </button>
  </div>
);
}
  const handleVerifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifiedLoading(true);
    setVerifiedError('');

    try {
      if (!fullName || !rollNumber || !year || !branch || !section) {
        throw new Error('Please fill in all required fields.');
      }
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) throw signInError;
      if (!signInData.user) throw new Error('Failed to create account');

      // Create profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: signInData.user.id,
        username: rollNumber,
        full_name: fullName,
        roll_number: rollNumber,
        year,
        branch,
        section,
        is_verified: true,
        is_anonymous: false,
      });

      if (profileError) throw profileError;

      router.push('/feed');
    } catch (err: unknown) {
      setVerifiedError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setVerifiedLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl sm:text-6xl font-bold text-white">CICS</h1>
          <p className="text-gray-400 mt-3 text-sm sm:text-base">
            Your college. Your space. Talk freely.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-white font-semibold text-xl">Join with your details</h2>
              <p className="text-gray-500 text-sm">Instant access with a verified badge.</p>
            </div>

            <form onSubmit={handleVerifiedSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Roll Number *</label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={e => setRollNumber(e.target.value)}
                    placeholder="e.g. 21CSE042"
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1.5">Year *</label>
                    <select
                      value={year}
                      onChange={e => setYear(e.target.value)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                      required
                    >
                      <option value="">Year</option>
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1.5">Branch *</label>
                    <select
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                      required
                    >
                      <option value="">Branch</option>
                      {BRANCHES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1.5">Section *</label>
                    <select
                      value={section}
                      onChange={e => setSection(e.target.value)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                      required
                    >
                      <option value="">Section</option>
                      {SECTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {verifiedError && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                  {verifiedError}
                </p>
              )}

              <button
                type="submit"
                disabled={verifiedLoading}
                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifiedLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating account...
                  </>
                ) : 'Join Now'}
              </button>
            </form>
          </div>

          <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-white font-semibold text-xl">Stay Anonymous</h2>
              <p className="text-gray-500 text-sm">Random username, zero personal details.</p>
            </div>

            <button
              onClick={handleAnonymous}
              disabled={anonLoading}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {anonLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating session...
                </span>
              ) : 'Continue Anonymously'}
            </button>

            {anonError && (
              <p className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                {anonError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
