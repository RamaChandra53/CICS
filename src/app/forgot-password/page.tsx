'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseRollNumber } from '@/lib/parseRoll';
import { generateOTP, storeOTP, verifyOTP, sendOTPEmail } from '@/lib/otp';

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
  const searchParams = useSearchParams();
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

  // Check for magic link tokens from password reset email
  useEffect(() => {
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
  }, [searchParams, supabase]);

  const parsedRoll = parseRollNumber(rollNumber);
  const showInvalidRollMessage = rollNumber.trim().length > 0 && !parsedRoll;

  const validateEmail = (email: string) => {
    return email.endsWith('@mgit.ac.in') && email.length > '@mgit.ac.in'.length;
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

    setLoading(true);

    try {
      // Check if roll number exists in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('roll_number', rollNumber.trim().toUpperCase())
        .single();

      if (profileError || !profile) {
        throw new Error('Roll number not found. Please check your roll number.');
      }

      // Generate and send custom OTP code
      const otp = generateOTP();
      
      // Store OTP in database
      await storeOTP(email, otp, 'password_reset');
      
      // Send OTP via email
      await sendOTPEmail(email, otp, 'password_reset');

      setUserId(profile.id);
      setTempEmail(email);
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
      // Verify OTP using our custom system
      const isValid = await verifyOTP(tempEmail, otp, 'password_reset');
      
      if (!isValid) {
        throw new Error('Invalid or expired OTP code');
      }

      // Since we verified the OTP, we can proceed to password reset step
      // We'll use admin API directly for password update
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
      console.log(`=== RESETTING PASSWORD ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Email: ${tempEmail}`);
      console.log(`New password length: ${newPassword.length}`);

      // Use API route to reset password
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
          rollNumber: rollNumber.trim().toUpperCase(),
        }),
      });

      console.log(`API response status:`, response.status);

      const result = await response.json();
      console.log(`API response result:`, result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      console.log(`Password reset successful!`);

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
              <p className="text-gray-400 text-sm">
                We've sent a 6-digit OTP to {tempEmail}
              </p>
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
