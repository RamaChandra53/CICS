'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateMGITEmail } from '@/lib/emailValidation';

type ResetState = 'ready' | 'success';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>('ready');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmail = window.sessionStorage.getItem('cics_password_reset_email');
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!validateMGITEmail(normalizedEmail)) {
      setError('Enter the MGIT email you used to request the reset code.');
      return;
    }
    if (!/^\d{6}$/.test(otpCode)) {
      setError('Enter the 6-digit reset code from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otpCode, password: newPassword }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'We could not update your password. Please try again.');
      }

      window.sessionStorage.removeItem('cics_password_reset_email');
      setState('success');
      window.setTimeout(() => router.replace('/'), 1800);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'We could not update your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (state === 'success') {
    return (
      <StatusCard
        title="Password updated successfully"
        detail="You can now log in with your new password. Redirecting you to login..."
        primaryLabel="Go to login"
        onPrimary={() => router.replace('/')}
      />
    );
  }

  const passwordIsLongEnough = newPassword.length >= 6;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#080b12] px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#101521] p-5 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 text-base font-black text-white">C</span>
            <span className="font-semibold text-white">CICS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Enter the reset code from your email and choose a new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-xs font-medium text-slate-300">MGIT college email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setError(''); }}
              autoComplete="email"
              inputMode="email"
              className="w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
              placeholder="yourname@mgit.ac.in"
            />
          </div>

          <div>
            <label htmlFor="reset-code" className="mb-1.5 block text-xs font-medium text-slate-300">Reset code</label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              autoComplete="one-time-code"
              className="w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-lg tracking-[0.3em] text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
              placeholder="000000"
              maxLength={6}
            />
          </div>

          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-slate-300">New password</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => { setNewPassword(event.target.value); setError(''); }}
                autoComplete="new-password"
                minLength={6}
                aria-describedby="password-requirement"
                className="w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-16 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
                placeholder="At least 6 characters"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-slate-400 transition hover:text-white focus:outline-none focus:text-white">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p id="password-requirement" className={`mt-1.5 text-xs ${passwordIsLongEnough ? 'text-emerald-300' : 'text-slate-500'}`}>
              {passwordIsLongEnough ? 'Meets the 6-character minimum' : 'Use at least 6 characters'}
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-slate-300">Confirm new password</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => { setConfirmPassword(event.target.value); setError(''); }}
              autoComplete="new-password"
              minLength={6}
              aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
              className="w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
              placeholder="Re-enter your password"
            />
            {confirmPassword.length > 0 && (
              <p className={`mt-1.5 text-xs ${passwordsMatch ? 'text-emerald-300' : 'text-rose-300'}`}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          {error && <p role="alert" className="break-words rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Updating password...' : 'Update password'}
          </button>
          <button type="button" onClick={() => router.replace('/forgot-password')} className="w-full py-2 text-sm font-medium text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50">
            Request a new code
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusCard({ title, detail, primaryLabel, onPrimary }: {
  title: string;
  detail: string;
  primaryLabel: string;
  onPrimary: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#080b12] px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#101521] p-6 text-center shadow-2xl shadow-black/40 sm:p-8" aria-live="polite">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/15 text-lg font-bold text-emerald-300">✓</div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="mt-2 break-words text-sm leading-6 text-slate-400">{detail}</p>
        <button type="button" onClick={onPrimary} className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-4 focus:ring-indigo-400/30">{primaryLabel}</button>
      </section>
    </main>
  );
}
