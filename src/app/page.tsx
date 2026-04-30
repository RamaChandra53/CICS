'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { generateAnonUsername } from '@/lib/utils';
import { BRANCHES, YEARS, SECTIONS } from '@/types';

type AuthMode = 'choose' | 'verified' | 'pending';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<AuthMode>('choose');
 
  // Verified login form fields
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);


  const handleAnonymous = async () => {
    setLoading(true);
    setError('');

    try {
      const username = generateAnonUsername();

      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) throw error;
      if (!data.user) throw new Error('Anonymous login failed');

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        is_anonymous: true,
        is_verified: false,
      });

      if (profileError) throw profileError;

      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
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
    setLoading(true);
    setError('');

    try {
      if (!fullName || !rollNumber || !year || !branch || !section || !email || !password) {
        throw new Error('Please fill in all required fields.');
      }
      if (!idCardFile) {
        throw new Error('Please upload your college ID card.');
      }

      // Sign up with email/password
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: rollNumber, is_anonymous: false },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Failed to create account');

      const userId = signUpData.user.id;

      // Upload ID card to Supabase Storage
      const fileExt = idCardFile.name.split('.').pop();
      const filePath = `${userId}/id-card.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(filePath, idCardFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the file path (not a public URL since bucket is private)
      // Admins will generate signed URLs when reviewing verifications
      const idCardPath = filePath;

      // Create profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        username: rollNumber,
        full_name: fullName,
        roll_number: rollNumber,
        year,
        branch,
        section,
        is_verified: false,
        is_anonymous: false,
        id_card_url: idCardPath,
      });

      if (profileError) throw profileError;

      setMode('pending');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'pending') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-6">⏳</div>
          <h1 className="text-2xl font-bold text-white mb-3">Verification Pending</h1>
          <p className="text-gray-400 mb-6">
            Your ID card is being reviewed. You&apos;ll get full access once manually approved by an admin.
          </p>
          <div className="bg-[#1a1a2e] border border-indigo-500/30 rounded-xl p-5">
            <p className="text-indigo-400 text-sm">
              💡 While you wait, you can still browse once your account is confirmed. Check back soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-white">CICS</h1>
          <p className="text-gray-400 mt-2 text-sm">
            College Internal Communication System — private, students only.
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-4">
            {/* Verified Login Option */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🪪</span>
                <div>
                  <h2 className="text-white font-semibold text-lg">Verified Login</h2>
                  <p className="text-gray-500 text-xs">Full access with a ✓ badge after ID check</p>
                </div>
              </div>
              <button
                onClick={() => setMode('verified')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Register with College ID
              </button>
            </div>

            {/* Anonymous Option */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">👻</span>
                <div>
                  <h2 className="text-white font-semibold text-lg">Go Anonymous</h2>
                  <p className="text-gray-500 text-xs">Instant access, random username, no identity</p>
                </div>
              </div>
              <button
                onClick={handleAnonymous}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating session...
                  </span>
                ) : 'Continue Anonymously'}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                {error}
              </p>
            )}
          </div>
        )}

        {mode === 'verified' && (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6">
            <button
              onClick={() => { setMode('choose'); setError(''); }}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-5 text-sm transition-colors"
            >
              ← Back
            </button>
            <h2 className="text-white font-semibold text-xl mb-5">Register with College ID</h2>

            <form onSubmit={handleVerifiedSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1.5">Year *</label>
                    <select
                      value={year}
                      onChange={e => setYear(e.target.value)}
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
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
                      className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    >
                      <option value="">Sec</option>
                      {SECTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="min 6 characters"
                    className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">College ID Card Photo *</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setIdCardFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="id-card-upload"
                      required
                    />
                    <label
                      htmlFor="id-card-upload"
                      className="flex items-center gap-3 w-full bg-[#111] border border-dashed border-gray-700 hover:border-indigo-500 rounded-xl px-4 py-3 text-sm cursor-pointer transition-colors"
                    >
                      <span className="text-xl">📎</span>
                      <span className={idCardFile ? 'text-indigo-400' : 'text-gray-500'}>
                        {idCardFile ? idCardFile.name : 'Click to upload ID card'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit for Verification'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
