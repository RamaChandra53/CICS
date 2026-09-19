'use client';

import { useState } from 'react';
import CollegeEmailVerificationModal from './CollegeEmailVerificationModal';

interface TrustUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  userRollNumber: string;
}

/**
 * Modal shown when an unverified user tries to:
 * - Use anonymous identity
 * - Use partial identity
 * - Edit their pseudo username
 *
 * Explains the trust system and offers to start verification.
 */
export default function TrustUnlockModal({
  isOpen,
  onClose,
  onVerified,
  userRollNumber,
}: TrustUnlockModalProps) {
  const [showVerification, setShowVerification] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = sessionStorage.getItem('cics_pending_verification');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.rollNumber === userRollNumber && Date.now() - parsed.sentAt < 10 * 60 * 1000;
      }
    } catch {}
    return false;
  });

  if (!isOpen) return null;

  // If user clicked "Verify Student Account", show the actual verification modal
  if (showVerification) {
    return (
      <CollegeEmailVerificationModal
        isOpen={true}
        onClose={() => {
          setShowVerification(false);
          onClose();
        }}
        onSuccess={() => {
          setShowVerification(false);
          onVerified();
        }}
        userRollNumber={userRollNumber}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#252a31] bg-[#15181c] p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-lg">
              🔓
            </div>
            <h2 className="text-lg font-semibold text-white">
              Verify as an MGIT student
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Unlock features list */}
        <div className="mb-5 space-y-3">
          <p className="text-sm text-slate-300">Unlock:</p>
          <ul className="space-y-2.5">
            {[
              { icon: '👻', label: 'Anonymous posting' },
              { icon: '🏷', label: 'Partial identity (Branch · Year)' },
              { icon: '✏️', label: 'Custom campus nickname' },
              { icon: '🛡', label: 'Trusted communities' },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm text-slate-200">
                <span className="text-base">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Reassurance text */}
        <div className="mb-6 rounded-xl border border-[#252a31] bg-[#0f1318] px-3 py-2.5">
          <p className="text-xs text-slate-400">
            Basic posting already works using your campus nickname. Verification just unlocks more options.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={() => setShowVerification(true)}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Verify Student Account
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center rounded-xl text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
