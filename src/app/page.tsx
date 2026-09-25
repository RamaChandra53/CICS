'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { INVALID_ROLL_MESSAGE, parseRollNumber } from '@/lib/parseRoll';
import { validateMGITEmail } from '@/lib/emailValidation';

function getReadableErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

async function createAccount(rollNumber: string, collegeEmail: string, password: string, otpCode: string) {
  const response = await fetch('/api/auth/first-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber, collegeEmail, password, otpCode }),
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
  const [showPassword, setShowPassword] = useState(false);
  // OTP verification state for registration
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const parsedRoll = parseRollNumber(rollNumber.trim());

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace('/feed');
    };
    void checkSession();
  }, [router, supabase]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const clearError = () => {
    if (error) setError('');
  };

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setRegStep('form');
    setOtpCode('');
    setCountdown(0);
  };

  // Send OTP to the college email (registration step 1)
  const handleSendOtp = async () => {
    setOtpSending(true);
    setError('');
    try {
      const normalizedEmail = collegeEmail.trim().toLowerCase();
      if (!validateMGITEmail(normalizedEmail)) {
        throw new Error('Use your MGIT college email address (name@mgit.ac.in).');
      }
      if (!parsedRoll) throw new Error(INVALID_ROLL_MESSAGE);
      if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
      if (password !== confirmPassword) throw new Error('Passwords do not match.');

      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, type: 'email_verification' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');

      setRegStep('otp');
      setCountdown(60);
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
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

        // If we're still on the form step, send OTP first
        if (regStep === 'form') {
          setLoading(false);
          await handleSendOtp();
          return;
        }

        // On OTP step — verify and create account
        if (!/^\d{6}$/.test(otpCode)) throw new Error('Please enter a valid 6-digit code.');

        const account = await createAccount(rollNumber.trim().toUpperCase(), normalizedEmail, password, otpCode);
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

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : /[A-Z]/.test(password) && /\d/.test(password) ? 3 : 2;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b12] px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.035)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden max-w-xl lg:block">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Private MGIT-only website alpha
          </div>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">A private campus discussion website for MGIT.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">Browse campus talk, post honestly, and choose how your identity appears. Your email and roll number are for verification, not public display.</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ['MGIT-only', 'Access is limited to verified students'],
              ['Your identity', 'Post as pseudo, anonymous, or full identity'],
              ['Alpha test', 'Help us shape the first useful version'],
            ].map(([title, detail], index) => (
              <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/15 text-xs font-bold text-indigo-200">0{index + 1}</span>
                <p className="text-sm font-semibold text-slate-100">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-5 rounded-2xl border border-indigo-400/20 bg-indigo-400/10 p-4 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">CICS website alpha</p>
            <h1 className="mt-2 text-xl font-bold leading-tight text-white">Private MGIT campus discussions.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Email and roll number verify you are a student. They are not shown publicly.</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-[#101521]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
            <div className="mb-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 text-base font-black text-white shadow-lg shadow-indigo-950/50">C</span>
                <span className="font-semibold tracking-tight text-white">CICS</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{mode === 'login' ? 'Welcome back' : regStep === 'otp' ? 'Verify your email' : 'Join your campus'}</h2>
              <p className="mt-1.5 text-sm text-slate-400">{mode === 'login' ? 'Sign in to continue the campus conversation.' : regStep === 'otp' ? `Enter the 6-digit code sent to ${collegeEmail.trim().toLowerCase()}` : 'Create your private MGIT-only website account.'}</p>
            </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/5 bg-black/20 p-1">
          <button type="button" onClick={() => switchMode('login')} className={`rounded-lg py-2 text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
            Log in
          </button>
          <button type="button" onClick={() => switchMode('register')} className={`rounded-lg py-2 text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── Registration Step 1: Form fields ── */}
          {mode === 'register' && regStep === 'form' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Roll number</label>
                <input type="text" value={rollNumber} onChange={(event) => { setRollNumber(event.target.value.toUpperCase()); clearError(); }} placeholder="e.g. 25261A0512" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10" required maxLength={10} />
                {rollNumber && !parsedRoll && <p className="mt-1.5 text-xs text-rose-300">{INVALID_ROLL_MESSAGE}</p>}
                {parsedRoll && <p className="mt-1.5 text-xs text-emerald-300">Looks right · {parsedRoll.year} year · {parsedRoll.branch} · Section {parsedRoll.section}</p>}
              </div>
            </>
          )}

          {/* ── Registration Step 2: OTP entry ── */}
          {mode === 'register' && regStep === 'otp' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Verification code</label>
                <input type="text" inputMode="numeric" value={otpCode} onChange={(event) => { setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6)); clearError(); }} placeholder="000000" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-lg tracking-[0.3em] text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10" required maxLength={6} autoFocus />
                <p className="mt-1.5 text-xs text-slate-500">Check your inbox (and spam folder) for the code.</p>
              </div>

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setRegStep('form'); setOtpCode(''); setError(''); }} className="text-xs font-medium text-slate-400 hover:text-white transition">← Back</button>
                <button type="button" disabled={countdown > 0 || otpSending} onClick={handleSendOtp} className="text-xs font-medium text-indigo-300 hover:text-indigo-200 disabled:text-slate-600 disabled:cursor-not-allowed transition">
                  {otpSending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}

          {/* ── Shared fields: email + password (hide during OTP step) ── */}
          {!(mode === 'register' && regStep === 'otp') && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">MGIT college email</label>
                <input type="email" value={collegeEmail} onChange={(event) => { setCollegeEmail(event.target.value); clearError(); }} placeholder="yourname@mgit.ac.in" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10" required autoComplete="email" />
                {mode === 'register' && <p className="mt-1.5 text-xs text-slate-500">One account per MGIT email. We never show your email publicly.</p>}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-medium text-slate-300">Password</label>{mode === 'login' && <button type="button" onClick={() => router.push('/forgot-password')} className="text-xs font-medium text-indigo-300 hover:text-indigo-200">Forgot password?</button>}</div>
                <div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); clearError(); }} placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-14 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10" required minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-slate-400 hover:text-white">{showPassword ? 'Hide' : 'Show'}</button></div>
                {mode === 'register' && password && <div className="mt-2 flex gap-1.5">{[1, 2, 3].map((level) => <span key={level} className={`h-1 flex-1 rounded-full ${passwordStrength >= level ? passwordStrength === 1 ? 'bg-rose-400' : passwordStrength === 2 ? 'bg-amber-400' : 'bg-emerald-400' : 'bg-white/10'}`} />)}</div>}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Confirm password</label>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError(); }} placeholder="Re-enter your password" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10" required minLength={6} autoComplete="new-password" />
                </div>
              )}
            </>
          )}

          {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}

          <button type="submit" disabled={loading || otpSending || (mode === 'register' && regStep === 'form' && rollNumber.length > 0 && !parsedRoll)} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-400 hover:to-violet-500 focus:outline-none focus:ring-4 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-50">
            {loading || otpSending ? 'Please wait...' : mode === 'register' ? (regStep === 'form' ? 'Send verification code' : 'Create my account') : 'Continue to CICS'} {!loading && !otpSending && <span className="transition-transform group-hover:translate-x-0.5">→</span>}
          </button>
        </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">By continuing, you&apos;re entering a student-only website alpha. Keep it kind, useful, and respectful.</p>
          </div>
          <p className="mt-5 text-center text-xs text-slate-600 lg:hidden">MGIT students only · Your college email stays private</p>
        </section>
      </div>
    </main>
  );
}
