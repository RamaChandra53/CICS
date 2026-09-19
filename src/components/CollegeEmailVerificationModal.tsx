'use client';

import { createRef, useMemo, useState, useEffect } from 'react';
import { validateMGITEmail, validateEmailMatchesRoll, maskEmail } from '@/lib/emailValidation';

interface CollegeEmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRollNumber: string;
}

export default function CollegeEmailVerificationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userRollNumber 
}: CollegeEmailVerificationModalProps) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // Refs for OTP input boxes
  const inputRefs = useMemo(() => Array.from({ length: 6 }, () => createRef<HTMLInputElement>()), []);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (isOpen && step === 'otp') {
      const focusId = window.setTimeout(() => inputRefs[0].current?.focus(), 120);
      return () => window.clearTimeout(focusId);
    }
    return undefined;
  }, [inputRefs, isOpen, step]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const normalizedEmail = email.trim().toLowerCase();
    if (!validateMGITEmail(normalizedEmail)) {
      setError('Must end with @mgit.ac.in');
      return;
    }

    if (!validateEmailMatchesRoll(normalizedEmail, userRollNumber)) {
      setError('This email doesn\'t match your roll number. Please use your own MGIT email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, type: 'email_verification' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setStep('otp');
      setResendTimer(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '').slice(0, 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
    inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (newOtp.every(digit => digit.length === 1)) {
      handleOtpSubmit(newOtp.join(''));
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedDigits) return;
    event.preventDefault();
    const nextOtp = Array.from({ length: 6 }, (_, index) => pastedDigits[index] ?? '');
    setOtp(nextOtp);
    setError('');
    const focusIndex = Math.min(pastedDigits.length, 5);
    inputRefs[focusIndex].current?.focus();
    if (pastedDigits.length === 6) void handleOtpSubmit(pastedDigits);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleOtpSubmit = async (otpCode?: string) => {
    const finalOtp = otpCode || otp.join('');
    
    if (finalOtp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otpCode: finalOtp, type: 'email_verification' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify OTP');

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), type: 'email_verification' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');

      setResendTimer(60);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setResendTimer(0);
  };

  const closeAndReset = () => {
    setEmail('');
    setStep('email');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setResendTimer(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="verification-title">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121926] p-5 shadow-2xl shadow-black/50 sm:p-7">
        <div className="flex items-center justify-between mb-6">
          <h2 id="verification-title" className="text-white text-xl font-semibold flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">✦</span>
            <span>Build your campus trust</span>
          </h2>
          <button
            onClick={closeAndReset}
            aria-label="Close verification"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            ×
          </button>
        </div>

        {step === 'email' ? (
          <>
            <div className="mb-6">
              <p className="text-slate-300 text-sm leading-6 mb-3">
                You can already post in open spaces. Verifying your MGIT email unlocks trusted identity options for communities like Placements.
              </p>
            </div>
            
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">College email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value.toLowerCase()); setError(''); }}
                  placeholder="you@mgit.ac.in"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10"
                  required
                />
                <p className="text-slate-500 text-xs mt-1.5">
                  This must match the roll number on your account.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAndReset}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium py-3 transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold py-3 shadow-lg shadow-indigo-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-2">
                A 6-digit code is on its way to <span className="font-medium text-indigo-200">{maskEmail(email)}</span>
              </p>
              <p className="text-gray-400 text-xs">
                It expires in 10 minutes. Paste the full code or enter each digit.
              </p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleOtpSubmit(); }} className="space-y-4">
              <div className="flex justify-center gap-2 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    aria-label={`Verification code digit ${index + 1}`}
                    className="h-12 w-10 rounded-xl border border-white/10 bg-black/20 text-center text-lg font-bold text-white outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 sm:w-12"
                    maxLength={1}
                    inputMode="numeric"
                    pattern="[0-9]"
                  />
                ))}
              </div>
              
              {error && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || otp.some(digit => !digit)}
                  className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold py-3 shadow-lg shadow-indigo-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                  >
                    ← Back
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
