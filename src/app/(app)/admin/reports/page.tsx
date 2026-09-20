'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/utils';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Report {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  // Joined data
  posts?: { id: string; content: string; author_id: string } | null;
  comments?: { id: string; content: string; post_id: string; author_id: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  reviewed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  actioned: 'bg-red-500/20 text-red-300 border-red-500/30',
  dismissed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const REASON_LABELS: Record<string, string> = {
  spam: '🗑️ Spam',
  harassment: '⚠️ Harassment',
  inappropriate: '🚫 Inappropriate',
  misinformation: '❌ Misinformation',
  other: '📝 Other',
};

function ReportsPageContent() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [isAdmin, setIsAdmin] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Check the server-only moderator allowlist and synchronize admins.
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const response = await fetch('/api/moderation/me');
      const status = await response.json();
      if (response.ok && status.isModerator) {
        setIsAdmin(true);
      } else {
        router.push('/feed');
      }
    };
    checkAdmin();
  }, [user, supabase, router]);

  const fetchReports = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select('*, posts(id, content, author_id), comments(id, content, post_id, author_id)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Error fetching reports:', error);
        return;
      }

      setReports((data as Report[]) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, isAdmin, filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = async (reportId: string, status: string) => {
    if (!user) return;
    setActioningId(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes[reportId] || null,
        })
        .eq('id', reportId);

      if (error) throw error;

      // If actioned on a post, delete the post
      if (status === 'actioned') {
        const report = reports.find(r => r.id === reportId);
        if (report?.post_id) {
          await supabase.from('posts').delete().eq('id', report.post_id);
        } else if (report?.comment_id) {
          await supabase.from('comments').delete().eq('id', report.comment_id);
        }
      }

      await fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleModerationAction = async (report: Report, action: 'warn' | 'mute' | 'kick' | 'ban') => {
    const targetUserId = report.posts?.author_id ?? report.comments?.author_id;
    if (!targetUserId) return;
    const reason = window.prompt(`Reason for ${action}:`, 'Community guidelines violation')?.trim();
    if (!reason) return;
    setActioningId(report.id);
    try {
      const response = await fetch('/api/moderation/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId,
          postId: report.post_id,
          commentId: report.comment_id,
          reportId: report.id,
          reason,
          durationHours: action === 'ban' ? 168 : action === 'mute' ? 24 : undefined,
        }),
      });
      if (!response.ok) throw new Error('Moderation action failed');
      await fetchReports();
    } catch (err) {
      console.error('Moderation action error:', err);
    } finally {
      setActioningId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white">Reports</h1>
        <Link
          href="/admin/username-review"
          className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
        >
          Username Review →
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {['pending', 'reviewed', 'actioned', 'dismissed', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                : 'border-[#252a31] text-slate-400 hover:text-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#252a31] bg-[#15181c] p-4">
              <div className="h-4 bg-[#1f2329] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[#1f2329] rounded w-full mb-1" />
              <div className="h-3 bg-[#1f2329] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-slate-400 text-sm">No {filter !== 'all' ? filter : ''} reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const contentPreview = report.posts?.content || report.comments?.content || 'Content deleted';
            const targetType = report.post_id ? 'Post' : 'Comment';
            const targetLink = report.post_id
              ? `/post/${report.post_id}`
              : report.comments?.post_id
              ? `/post/${report.comments.post_id}`
              : null;

            return (
              <div
                key={report.id}
                className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[report.status]}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-400">{REASON_LABELS[report.reason] || report.reason}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{formatTimeAgo(report.created_at)}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0">{targetType}</span>
                </div>

                {/* Reported content preview */}
                <div className="rounded-xl border border-[#252a31] bg-[#0f1318] p-3 mb-3">
                  <p className="text-sm text-slate-300 line-clamp-3">{contentPreview}</p>
                  {targetLink && (
                    <Link
                      href={targetLink}
                      className="inline-block mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      View {targetType.toLowerCase()} →
                    </Link>
                  )}
                </div>

                {/* Reporter details */}
                {report.details && (
                  <p className="text-xs text-slate-400 mb-3 italic">&quot;{report.details}&quot;</p>
                )}

                {/* Admin actions */}
                {report.status === 'pending' && (
                  <div className="border-t border-[#252a31] pt-3 mt-3">
                    <input
                      type="text"
                      value={adminNotes[report.id] || ''}
                      onChange={(e) => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      placeholder="Admin notes (optional)..."
                      className="w-full rounded-lg border border-[#252a31] bg-[#0f1318] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500/40 focus:outline-none mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        disabled={actioningId === report.id}
                        className="rounded-lg border border-[#252a31] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#1f2329] transition-colors disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'reviewed')}
                        disabled={actioningId === report.id}
                        className="rounded-lg border border-indigo-500/30 px-3 py-1.5 text-xs text-indigo-300 hover:bg-indigo-500/10 transition-colors disabled:opacity-50"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'actioned')}
                        disabled={actioningId === report.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                      >
                        Delete Content
                      </button>
                    </div>
                    {(report.posts?.author_id || report.comments?.author_id) && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#252a31] pt-3">
                        <span className="self-center text-[10px] font-bold uppercase tracking-wider text-slate-600">User actions</span>
                        {(['warn', 'mute', 'kick', 'ban'] as const).map((action) => (
                          <button
                            key={action}
                            onClick={() => handleModerationAction(report, action)}
                            disabled={actioningId === report.id}
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors disabled:opacity-50 ${action === 'ban' ? 'border-red-500/30 text-red-300 hover:bg-red-500/10' : 'border-cyan-400/20 text-cyan-200 hover:bg-cyan-400/10'}`}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Review info */}
                {report.reviewed_at && (
                  <div className="border-t border-[#252a31] pt-2 mt-3">
                    <p className="text-[10px] text-slate-600">
                      Reviewed {formatTimeAgo(report.reviewed_at)}
                      {report.admin_notes && <span className="ml-2 text-slate-500">— {report.admin_notes}</span>}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ErrorBoundary>
      <ReportsPageContent />
    </ErrorBoundary>
  );
}
