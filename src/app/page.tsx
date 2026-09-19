'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { INVALID_ROLL_MESSAGE, parseRollNumber } from '@/lib/parseRoll';
import { validateMGITEmail } from '@/lib/emailValidation';

function getReadableErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

async function createAccount(rollNumber: string, collegeEmail: string, password: string) {
  const response = await fetch('/api/auth/first-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber, collegeEmail, password }),
  });
  const result = await response.json();

  if (!response.ok) throw new Error(result.error || 'Failed to create account.');
  return result as { userId: string; email: string };
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [rollNumber, setRollNumber] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const parsedRoll = parseRollNumber(rollNumber.trim());

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace('/feed');
    };
    void checkSession();
  }, [router, supabase]);

  const clearError = () => {
    if (error) setError('');
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedEmail = collegeEmail.trim().toLowerCase();
      if (!validateMGITEmail(normalizedEmail)) {
        throw new Error('Use your MGIT college email address (name@mgit.ac.in).');
      }

      if (mode === 'register') {
        if (!parsedRoll) throw new Error(INVALID_ROLL_MESSAGE);
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const account = await createAccount(rollNumber.trim().toUpperCase(), normalizedEmail, password);
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: account.email,
          password,
        });
        if (signInError || !data.user) {
          throw new Error('Account created, but sign-in failed. Please log in with your new password.');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError || !data.user) throw new Error('Invalid college email or password.');
      }

      router.replace('/feed');
    } catch (submitError: unknown) {
      setError(getReadableErrorMessage(submitError));
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

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#111] p-1">
          <button type="button" onClick={() => switchMode('login')} className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-[#6366f1] text-white' : 'text-gray-400'}`}>
            Log in
          </button>
          <button type="button" onClick={() => switchMode('register')} className={`rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-[#6366f1] text-white' : 'text-gray-400'}`}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Roll Number</label>
              <input type="text" value={rollNumber} onChange={(event) => { setRollNumber(event.target.value); clearError(); }} placeholder="e.g. 25261A0512" className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors" required maxLength={10} />
              {rollNumber && !parsedRoll && <p className="mt-1.5 text-xs text-red-400">{INVALID_ROLL_MESSAGE}</p>}
              {parsedRoll && <p className="mt-1.5 text-xs text-gray-500">{parsedRoll.year} year · {parsedRoll.branch} · Section {parsedRoll.section}</p>}
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-xs mb-1.5">MGIT College Email</label>
            <input type="email" value={collegeEmail} onChange={(event) => { setCollegeEmail(event.target.value); clearError(); }} placeholder="yourname@mgit.ac.in" className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors" required />
            {mode === 'register' && <p className="mt-1.5 text-xs text-gray-500">One account is allowed per MGIT email address.</p>}
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5">Password</label>
            <input type="password" value={password} onChange={(event) => { setPassword(event.target.value); clearError(); }} placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'} className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors" required minLength={mode === 'register' ? 6 : undefined} />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError(); }} placeholder="Re-enter your password" className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors" required minLength={6} />
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">{error}</p>}

          <button type="submit" disabled={loading || (mode === 'register' && rollNumber.length > 0 && !parsedRoll)} className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <button onClick={() => router.push('/forgot-password')} className="text-gray-400 hover:text-white text-sm transition-colors">Forgot password?</button>
          </div>
        )}
      </div>
    </div>
  );
}
