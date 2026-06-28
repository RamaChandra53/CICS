'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import ReportModal from './ReportModal';

interface HorizontalVoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  commentCount?: number;
  showActions?: boolean;
  postContent?: string;
  initialUserVote?: 'up' | 'down' | null;
  currentUserId?: string | null;
  skipSync?: boolean;
  onPostUpdate?: (postId: string, updates: { upvotes: number; downvotes: number; user_vote: VoteType | null }) => void;
}

type VoteType = 'up' | 'down';

export default function HorizontalVoteButtons({
  postId,
  initialUpvotes,
  initialDownvotes,
  commentCount = 0,
  showActions = true,
  postContent = '',
  initialUserVote,
  currentUserId,
  skipSync = false,
  onPostUpdate,
}: HorizontalVoteButtonsProps) {
  const supabase = useMemo(() => createClient(), []);

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [voting, setVoting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return 'Failed to record vote. Please try again.';
  };

  // Share functionality
  const handleShare = useCallback(async () => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    const shareText = postContent?.split('\n')[0].substring(0, 100) || 'Check out this post';
    
    if (navigator.share) {
      // Native share API for mobile
      try {
        await navigator.share({
          title: 'CICS Post',
          text: shareText,
          url: postUrl
        });
      } catch (error) {
        console.error('Share failed:', error);
        // Fallback to clipboard
        await copyToClipboard(postUrl);
      }
    } else {
      // Fallback for desktop - copy to clipboard
      await copyToClipboard(postUrl);
    }
  }, [postId, postContent]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success feedback (you could add a toast here)
      console.log('Post link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialUpvotes, initialDownvotes]);

  const syncVoteState = useCallback(
    async (currentUserId: string | null) => {
      const [upvoteQuery, downvoteQuery, voteQuery] = await Promise.all([
        supabase
          .from('post_votes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .eq('vote_type', 'up'),

        supabase
          .from('post_votes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .eq('vote_type', 'down'),

        currentUserId
          ? supabase
              .from('post_votes')
              .select('vote_type')
              .eq('post_id', postId)
              .eq('user_id', currentUserId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (upvoteQuery.error) throw upvoteQuery.error;
      if (downvoteQuery.error) throw downvoteQuery.error;
      if (voteQuery.error) throw voteQuery.error;

      setUpvotes(upvoteQuery.count ?? 0);
      setDownvotes(downvoteQuery.count ?? 0);
      setUserVote((voteQuery.data?.vote_type as VoteType | undefined) ?? null);
    },
    [postId, supabase]
  );

  const loadVote = useCallback(async () => {
    try {
      setUserVote(initialUserVote ?? null);
      if (currentUserId !== undefined) {
        await syncVoteState(currentUserId);
      } else {
        await syncVoteState(null);
      }
    } catch (err: unknown) {
      console.error('Vote loading error:', err instanceof Error ? err.message : String(err));
    }
  }, [syncVoteState, currentUserId, initialUserVote]);

  useEffect(() => {
    if (skipSync) return;
    loadVote();
  }, [loadVote, skipSync]);

  useEffect(() => {
    if (!skipSync) return;
    setUserVote(initialUserVote ?? null);
  }, [currentUserId, initialUserVote, skipSync]);

  const handleVote = async (e: React.MouseEvent, type: VoteType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId || voting) return;

    const prevUserVote = userVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    setVoting(true);

    const applyOptimisticUpdate = (nextVote: VoteType | null, nextUpvotes: number, nextDownvotes: number) => {
      setUserVote(nextVote);
      setUpvotes(nextUpvotes);
      setDownvotes(nextDownvotes);
      onPostUpdate?.(postId, {
        upvotes: nextUpvotes,
        downvotes: nextDownvotes,
        user_vote: nextVote,
      });
    };

    try {
      if (userVote === type) {
        const nextVote = null;
        const nextUpvotes = type === 'up' ? Math.max(0, upvotes - 1) : upvotes;
        const nextDownvotes = type === 'down' ? Math.max(0, downvotes - 1) : downvotes;
        applyOptimisticUpdate(nextVote, nextUpvotes, nextDownvotes);

        const { error } = await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) throw error;
      } else if (userVote === null) {
        const nextVote = type;
        const nextUpvotes = type === 'up' ? upvotes + 1 : upvotes;
        const nextDownvotes = type === 'down' ? downvotes + 1 : downvotes;
        applyOptimisticUpdate(nextVote, nextUpvotes, nextDownvotes);

        const { error } = await supabase.from('post_votes').insert({
          post_id: postId,
          user_id: currentUserId,
          vote_type: type,
        });

        if (error) throw error;
      } else {
        const nextVote = type;
        const nextUpvotes =
          type === 'up' ? upvotes + 1 : Math.max(0, upvotes - 1);
        const nextDownvotes =
          type === 'down' ? downvotes + 1 : Math.max(0, downvotes - 1);
        applyOptimisticUpdate(nextVote, nextUpvotes, nextDownvotes);

        const { error } = await supabase
          .from('post_votes')
          .update({ vote_type: type })
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) throw error;
      }

      if (!skipSync) {
        await syncVoteState(currentUserId);
      }
    } catch (err: unknown) {
      applyOptimisticUpdate(prevUserVote, prevUpvotes, prevDownvotes);
      console.error('Vote error:', err instanceof Error ? err.message : String(err));
    } finally {
      setVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex shrink-0 h-9 items-center gap-1 rounded-full border border-[#252a31] bg-[#0f1318] px-2">
        <button
          onClick={(e) => handleVote(e, 'up')}
          disabled={voting || !currentUserId}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors ${
            userVote === 'up' ? 'text-indigo-300' : 'hover:text-indigo-200'
          } ${!currentUserId ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Upvote"
        >
          <span className="text-xs">▲</span>
        </button>

        <span
          className={`text-xs font-semibold ${
            userVote === 'up'
              ? 'text-indigo-300'
              : userVote === 'down'
              ? 'text-red-300'
              : 'text-slate-200'
          }`}
        >
          {score}
        </span>

        <button
          onClick={(e) => handleVote(e, 'down')}
          disabled={voting || !currentUserId}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors ${
            userVote === 'down' ? 'text-red-300' : 'hover:text-slate-200'
          } ${!currentUserId ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Downvote"
        >
          <span className="text-xs">▼</span>
        </button>
      </div>

      {showActions && (
        <>
          <button
            aria-label="View comments"
            className="flex shrink-0 h-9 items-center gap-2 rounded-full border border-[#252a31] px-3 text-xs text-slate-200 hover:text-indigo-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h7m-9 8 3.5-3H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2v3z" />
            </svg>
            <span>{commentCount}</span>
          </button>
          <button
            onClick={handleShare}
            aria-label="Share post"
            className="flex shrink-0 h-9 items-center gap-2 rounded-full border border-[#252a31] px-3 text-xs text-slate-200 hover:text-indigo-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17 17 7m0 0H9m8 0v8" />
            </svg>
            Share
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            aria-label="Report post"
            className="flex shrink-0 h-9 items-center gap-2 rounded-full border border-[#252a31] px-3 text-xs text-slate-200 hover:text-red-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v18m0-12h12l-2 3 2 3H5" />
            </svg>
            Report
          </button>
        </>
      )}

      {showReportModal && currentUserId && (
        <ReportModal
          postId={postId}
          currentUserId={currentUserId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
