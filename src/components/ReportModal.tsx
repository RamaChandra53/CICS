'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

interface ReportModalProps {
  postId?: string;
  commentId?: string;
  currentUserId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', icon: '🗑️', description: 'Unwanted promotional content' },
  { value: 'harassment', label: 'Harassment', icon: '⚠️', description: 'Bullying or targeted attacks' },
  { value: 'inappropriate', label: 'Inappropriate', icon: '🚫', description: 'NSFW or offensive content' },
  { value: 'misinformation', label: 'Misinformation', icon: '❌', description: 'False or misleading information' },
  { value: 'other', label: 'Other', icon: '📝', description: 'Something else' },
] as const;

export default function ReportModal({
  postId,
  commentId,
  currentUserId,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentUserId,
          post_id: postId || null,
          comment_id: commentId || null,
          reason,
          details: details.trim() || null,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already reported this content.');
        } else {
          throw insertError;
        }
        return;
      }

      setSuccess(true);
      onSubmitted?.();

      // Auto-close after success
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Report error:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#252a31] bg-[#15181c] p-5 shadow-xl">
        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-white mb-1">Report Submitted</h3>
            <p className="text-sm text-slate-400">Thank you. Our team will review this.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Report Content</h3>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Why are you reporting this {postId ? 'post' : 'comment'}?
            </p>

            {/* Reason selection */}
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setReason(r.value); setError(''); }}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    reason === r.value
                      ? 'border-red-500/50 bg-red-500/10 text-red-200'
                      : 'border-[#252a31] text-slate-300 hover:border-[#353a41] hover:bg-[#1a1e24]'
                  }`}
                >
                  <span className="text-base">{r.icon}</span>
                  <div>
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-slate-500">{r.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Details */}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-[#252a31] bg-[#0f1318] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-red-500/40 focus:outline-none mb-4"
            />

            {error && (
              <p className="text-xs text-red-400 mb-3 rounded-lg border border-red-800/40 bg-red-900/20 p-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-[#252a31] text-sm font-medium text-slate-300 hover:bg-[#1f2329] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !reason}
                className="flex-1 h-10 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
