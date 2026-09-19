'use client';



import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { parseRollNumber } from '@/lib/parseRoll';
import { validateMGITEmail, validateEmailMatchesRoll } from '@/lib/emailValidation';

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null);
  const supabase = createClient();
  const [step, setStep] = useState<'details' | 'otp' | 'newPassword'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState<string>('');

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize searchParams on client side
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        setSearchParams(urlParams);
      } catch (error) {
        console.error('Error parsing URL params:', error);
      }
    }
  }, [isClient]);

  // Check for magic link tokens from password reset email
  useEffect(() => {
    // Only run on client side
    if (!isClient || !searchParams) return;
    
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const otpFlag = searchParams.get('otp');

    if (accessToken && refreshToken) {
      // Handle magic link redirect
      const handleMagicLink = async () => {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          // Get user info and proceed to password reset
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
            setTempEmail(user.email || '');
            setStep('newPassword');
          }
        } catch (err) {
          setError('Invalid or expired reset link. Please try again.');
        }
      };

      handleMagicLink();
    } else if (otpFlag === 'true') {
      // User clicked reset link and should enter OTP
      setStep('otp');
    }
  }, [isClient, searchParams, supabase]);

  const parsedRoll = parseRollNumber(rollNumber);
  const showInvalidRollMessage = rollNumber.trim().length > 0 && !parsedRoll;

  const validateEmail = (email: string) => {
    return validateMGITEmail(email);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!rollNumber.trim() || !email.trim()) {
      setError('Please enter both roll number and email.');
      return;
    }

    if (!parsedRoll) {
      setError('Invalid roll number format. Please check your roll number.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please use your MGIT college email (@mgit.ac.in)');
      return;
    }

    if (!validateEmailMatchesRoll(email, rollNumber.trim().toUpperCase())) {
      setError('This email doesn\'t match your roll number. Please use your own MGIT email.');
      return;
    }

    setLoading(true);

    try {
      // Check if roll number exists in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('roll_number', rollNumber.trim().toUpperCase())
        .single();

      if (profileError || !profile) {
        throw new Error('Roll number not found. Please check your roll number.');
      }

      // Generate and send OTP via secure server-side API
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), type: 'password_reset' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setUserId(profile.id);
      setTempEmail(email.trim().toLowerCase());
      setStep('otp');
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      setStep('newPassword');
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  // The user will receive a reset link directly in their email

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!userId) {
      setError('Session expired. Please start over.');
      return;
    }

    setLoading(true);

    try {
      // Use API route to reset password (OTP verified server-side)
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rollNumber: rollNumber.trim().toUpperCase(),
          newPassword,
          email: tempEmail,
          otp,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      // Success message and redirect
      setError('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: unknown) {
      setError(getReadableErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[#141414] border border-gray-800 rounded-2xl p-6 sm:p-7">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#141414] border border-gray-800 rounded-2xl p-6 sm:p-7">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">CICS</h1>
          <p className="text-gray-400 mt-2 text-sm">
            {step === 'details' && 'Reset your password'}
            {step === 'otp' && 'Enter verification code'}
            {step === 'newPassword' && 'Set new password'}
          </p>
        </div>

        {step === 'details' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
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
              <label className="block text-gray-400 text-xs mb-1.5">MGIT Email</label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="your.email@mgit.ac.in"
                className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                required
              />
            </div>

            {showInvalidRollMessage && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                Invalid roll number format. Please check your roll number.
              </p>
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
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm mb-4">Don&apos;t worry, it happens to the best of us. Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors text-center text-lg tracking-widest"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('details');
                  setOtp('');
                  setError('');
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your new password"
                className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Confirm your new password"
                className="w-full bg-[#111] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                required
                minLength={6}
              />
            </div>

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
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
