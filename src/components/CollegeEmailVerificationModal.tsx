'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
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
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // Refs for OTP input boxes
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateMGITEmail(email)) {
      setError('Must end with @mgit.ac.in');
      return;
    }

    if (!validateEmailMatchesRoll(email, userRollNumber)) {
      setError('This email doesn\'t match your roll number. Please use your own MGIT email.');
      return;
    }

    setLoading(true);
    try {
      // Send OTP via Supabase auth
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false // don't create new auth user
        }
      });

      if (error) throw error;

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
    newOtp[index] = value.slice(0, 1);
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
      // Verify OTP by attempting to sign in
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: finalOtp,
        type: 'email'
      });

      if (error) throw error;

      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Please login to verify your email');
      }

      // Update profile with verified college email
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          college_email: email,
          is_email_verified: true 
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error('Email verified but failed to update profile');
      }

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
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) throw error;

      setResendTimer(60);
      setError(''); // Clear any previous errors
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            Verify for trusted anonymous posting
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl transition-colors"
          >
            ×
          </button>
        </div>

        {step === 'email' ? (
          <>
            <div className="mb-6">
              <p className="text-gray-300 text-sm mb-3">
                Basic posting works without verification. MGIT email verification unlocks anonymous posting in higher-trust spaces like Placements.
              </p>
            </div>
            
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">College Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                  placeholder="___________________"
                  className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 border border-gray-700 font-mono"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">
                  Must end with @mgit.ac.in
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
                  onClick={onClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                📧 OTP sent to {maskEmail(email)}
              </p>
              <p className="text-gray-400 text-xs">
                Enter the 6-digit code:
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
                    className="w-12 h-12 bg-gray-800 text-white text-center text-lg font-bold rounded-lg border border-gray-700 focus:border-indigo-500 focus:outline-none"
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
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
