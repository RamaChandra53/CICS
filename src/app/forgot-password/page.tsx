'use client';

import { FormEvent, useState } from 'react';
import { validateMGITEmail } from '@/lib/emailValidation';
import { useRouter } from 'next/navigation';

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, you'll receive a password reset code shortly.";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your registered college email address.');
      return;
    }
    if (!validateMGITEmail(normalizedEmail)) {
      setError('Enter a valid MGIT college email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, type: 'password_reset' }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(
          response.status === 429
            ? result.error || 'Too many reset requests. Please wait a minute and try again.'
            : 'We could not send a reset code right now. Please try again shortly.'
        );
        return;
      }

      window.sessionStorage.setItem('cics_password_reset_email', normalizedEmail);
      setSent(true);
    } catch (requestError) {
      console.error('Password recovery request failed:', requestError);
      setError('Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#080b12] px-4 py-8 sm:px-6">
      <section className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#101521] p-5 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 text-base font-black text-white">C</span>
            <span className="font-semibold text-white">CICS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Enter the email address associated with your account.</p>
        </div>

        {sent ? (
          <div aria-live="polite">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-sm font-semibold text-emerald-200">Check your email</p>
              <p className="mt-1 text-sm leading-6 text-emerald-100/80">{GENERIC_SUCCESS_MESSAGE}</p>
            </div>
            <button type="button" onClick={() => router.push('/reset-password')} className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/30">
              Enter reset code
            </button>
            <button type="button" onClick={() => router.push('/')} className="mt-2 w-full py-2 text-sm font-medium text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50">
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="recovery-email" className="mb-1.5 block text-xs font-medium text-slate-300">MGIT college email</label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(''); }}
                placeholder="yourname@mgit.ac.in"
                autoComplete="email"
                inputMode="email"
                aria-describedby={error ? 'recovery-error' : undefined}
                aria-invalid={Boolean(error)}
                className="w-full min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
              />
            </div>
            {error && <p id="recovery-error" role="alert" className="break-words rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <button type="submit" disabled={loading} aria-busy={loading} className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-400 hover:to-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Sending reset code...' : 'Send reset code'}
            </button>
            <button type="button" onClick={() => router.push('/')} className="w-full py-2 text-sm font-medium text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50">
              Back to login
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
