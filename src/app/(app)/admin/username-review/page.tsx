'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function UsernameReviewPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = checking
  const [requests, setRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // ── Admin Gate ──────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile) {
      router.push('/');
      return;
    }

    const checkAdmin = async () => {
      try {
        const { data, error: adminError } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (adminError) {
          console.error('Admin check error:', adminError);
          // If table doesn't exist, deny access
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(data));
      } catch (err) {
        console.error('Admin check failed:', err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [authLoading, user, profile, supabase, router]);

  // ── Fetch Pending Requests ─────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('pseudo_username_status', 'pending')
        .not('pending_pseudo_username', 'is', null)
        .order('pseudo_username_requested_at', { ascending: true });

      if (fetchError) throw fetchError;
      setRequests(data ?? []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError('Failed to load pending username requests.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAdmin === true) {
      fetchRequests();
    }
  }, [isAdmin, fetchRequests]);

  // ── Actions ────────────────────────────────────────────────
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleApprove = async (userId: string, newUsername: string) => {
    try {
      setActionLoading(userId);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pseudo_username: newUsername,
          pseudo_username_status: 'approved',
          pseudo_username_last_changed_at: new Date().toISOString(),
          pending_pseudo_username: null,
          pseudo_username_requested_at: null,
          pseudo_username_rejection_reason: null,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setRequests((prev) => prev.filter((r) => r.id !== userId));
      showSuccess(`Approved username "${newUsername}"`);
    } catch (err) {
      console.error('Failed to approve:', err);
      setError('Failed to approve username request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    const reason = rejectionReasons[userId]?.trim();
    if (!reason) {
      setError('Please provide a rejection reason before rejecting.');
      return;
    }

    try {
      setActionLoading(userId);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pseudo_username_status: 'rejected',
          pseudo_username_rejection_reason: reason,
          pending_pseudo_username: null,
          pseudo_username_requested_at: null,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setRequests((prev) => prev.filter((r) => r.id !== userId));
      setRejectionReasons((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      showSuccess('Username request rejected');
    } catch (err) {
      console.error('Failed to reject:', err);
      setError('Failed to reject username request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading / Auth Gate Renders ────────────────────────────

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#252a31] border-t-indigo-500" />
          <p className="text-sm text-slate-400">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center px-4">
        <div className="rounded-2xl border border-[#252a31] bg-[#15181c] p-8 text-center max-w-sm">
          <div className="mb-4 text-4xl">🚫</div>
          <h2 className="mb-2 text-lg font-semibold text-white">Access Denied</h2>
          <p className="mb-5 text-sm text-slate-400">
            Only administrators can review username change requests.
          </p>
          <button
            onClick={() => router.push('/feed')}
            className="h-10 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Username Review</h1>
          <p className="text-slate-400 text-sm">
            Review and approve custom pseudo username requests from verified users.
          </p>
        </div>

        {/* Success toast */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-800/40 bg-emerald-900/20 p-4 flex items-center gap-3">
            <span className="text-emerald-400">✓</span>
            <p className="text-sm text-emerald-300">{successMessage}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-800/40 bg-red-900/20 p-4 flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-300 text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex h-[30vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#252a31] border-t-indigo-500" />
              <p className="text-sm text-slate-400">Loading requests…</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-[#252a31] bg-[#15181c] p-12 text-center">
            <div className="mb-4 text-4xl">✨</div>
            <h3 className="mb-2 text-lg font-semibold text-white">All caught up</h3>
            <p className="text-sm text-slate-400">
              There are no pending username requests to review.
            </p>
          </div>
        ) : (
          /* Request cards */
          <div className="space-y-4">
            <p className="text-xs text-slate-500 mb-2">
              {requests.length} pending request{requests.length !== 1 ? 's' : ''}
            </p>

            {requests.map((req) => {
              const isActioning = actionLoading === req.id;

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl border border-[#252a31] bg-[#15181c] p-5 transition-opacity ${
                    isActioning ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Info */}
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Username change arrow */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">Current:</span>
                        <span className="font-semibold text-white bg-[#1f2329] px-2.5 py-1 rounded-lg text-sm truncate max-w-[140px]">
                          {req.pseudo_username || 'None'}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="text-xs text-slate-500">Requested:</span>
                        <span className="font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 text-sm truncate max-w-[140px]">
                          {req.pending_pseudo_username}
                        </span>
                      </div>

                      {/* User metadata */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                        <div>
                          <span className="text-slate-400">Name: </span>
                          {req.full_name || '—'}
                        </div>
                        <div>
                          <span className="text-slate-400">Roll: </span>
                          {req.roll_number || '—'}
                        </div>
                        <div>
                          <span className="text-slate-400">Branch: </span>
                          {req.branch || '—'} {req.year ? `· ${req.year} Year` : ''}
                        </div>
                        <div>
                          <span className="text-slate-400">Requested: </span>
                          {req.pseudo_username_requested_at
                            ? new Date(req.pseudo_username_requested_at).toLocaleDateString()
                            : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <button
                        onClick={() =>
                          handleApprove(req.id, req.pending_pseudo_username!)
                        }
                        disabled={isActioning}
                        className="h-10 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {isActioning ? 'Processing…' : '✓ Approve'}
                      </button>

                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          placeholder="Rejection reason…"
                          value={rejectionReasons[req.id] || ''}
                          onChange={(e) =>
                            setRejectionReasons((prev) => ({
                              ...prev,
                              [req.id]: e.target.value,
                            }))
                          }
                          className="h-9 rounded-lg border border-[#252a31] bg-[#0b0f12] px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50"
                        />
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={
                            isActioning || !rejectionReasons[req.id]?.trim()
                          }
                          className="h-9 rounded-xl border border-red-900/50 text-sm font-semibold text-red-400 transition-colors hover:bg-red-900/20 disabled:opacity-40"
                        >
                          {isActioning ? 'Processing…' : '✗ Reject'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
