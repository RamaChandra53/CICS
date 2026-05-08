'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { generateOTP, storeOTP, verifyOTP, sendOTPEmail } from '@/lib/otp';
import { validateEmailMatchesRoll, validateMGITEmail } from '@/lib/emailValidation';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRollNumber: string;
}

export default function EmailVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  userRollNumber,
}: EmailVerificationModalProps) {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateMGITEmail(email)) {
      setError('Please use your MGIT college email (@mgit.ac.in)');
      return;
    }

    if (!validateEmailMatchesRoll(email, userRollNumber)) {
      setError('This email does not match your roll number. Please use your MGIT email.');
      return;
    }

    setLoading(true);
    try {
      // Generate and send custom OTP code
      const otp = generateOTP();
      
      // Store OTP in database
      await storeOTP(email, otp, 'email_verification');
      
      // Send OTP via email
      await sendOTPEmail(email, otp, 'email_verification');

      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
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
      const isValid = await verifyOTP(email, otp, 'email_verification');
      
      if (!isValid) {
        throw new Error('Invalid or expired OTP code');
      }

      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Please login to verify your email');
      }

      // Update profile to mark email as verified using current user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          email, 
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">
            {step === 'email' ? 'Verify your MGIT email' : 'Enter OTP'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl"
          >
            ×
          </button>
        </div>

        {step === 'email' ? (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Verify your MGIT email to unlock anonymous posting
            </p>
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="college.email@mgit.ac.in"
                  className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 border border-gray-700"
                  required
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Enter the 6-digit OTP sent to {email}
            </p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 border border-gray-700 text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg p-2">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
