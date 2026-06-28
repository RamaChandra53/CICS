'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

interface CommentHorizontalVotesProps {
  commentId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  currentUserId?: string | null;
  onReply?: () => void;
}

type VoteType = 'up' | 'down';

export default function CommentHorizontalVotes({
  commentId,
  initialUpvotes,
  initialDownvotes,
  currentUserId,
  onReply,
}: CommentHorizontalVotesProps) {
  const supabase = useMemo(() => createClient(), []);

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialUpvotes, initialDownvotes]);

  // Load user's existing vote
  const loadVote = useCallback(async () => {
    try {
      const uid = currentUserId;
      if (!uid || commentId.startsWith('optimistic-')) {
        return;
      }

      const { data, error } = await supabase
        .from('comment_votes')
        .select('vote_type')
        .eq('user_id', uid)
        .eq('comment_id', commentId)
        .maybeSingle();

      if (error) {
        // Table might not exist yet — silently ignore
        if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          return;
        }
        console.error('Comment vote loading error:', error.message || error);
        return;
      }

      if (data) {
        setUserVote(data.vote_type as VoteType);
      }
    } catch (err: unknown) {
      console.error('Comment vote loading error:', err instanceof Error ? err.message : String(err));
    }
  }, [supabase, commentId, currentUserId]);

  useEffect(() => {
    loadVote();
  }, [loadVote]);

  const handleVote = async (e: React.MouseEvent, type: VoteType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId || voting || commentId.startsWith('optimistic-')) return;

    const prevUserVote = userVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    setVoting(true);

    try {
      if (userVote === type) {
        // Remove vote
        setUserVote(null);
        if (type === 'up') setUpvotes(v => Math.max(0, v - 1));
        else setDownvotes(v => Math.max(0, v - 1));

        await supabase
          .from('comment_votes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('comment_id', commentId);
      } else if (userVote === null) {
        // New vote
        setUserVote(type);
        if (type === 'up') setUpvotes(v => v + 1);
        else setDownvotes(v => v + 1);

        await supabase
          .from('comment_votes')
          .insert({ user_id: currentUserId, comment_id: commentId, vote_type: type });
      } else {
        // Change vote
        setUserVote(type);
        if (type === 'up') {
          setUpvotes(v => v + 1);
          setDownvotes(v => Math.max(0, v - 1));
        } else {
          setDownvotes(v => v + 1);
          setUpvotes(v => Math.max(0, v - 1));
        }

        await supabase
          .from('comment_votes')
          .update({ vote_type: type })
          .eq('user_id', currentUserId)
          .eq('comment_id', commentId);
      }
    } catch (err: unknown) {
      // Rollback on error
      setUserVote(prevUserVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      console.error('Comment vote error:', err);
    } finally {
      setVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-8 items-center gap-0.5 rounded-full border border-[#252a31] bg-[#0f1318] px-2">
        <button
          onClick={(e) => handleVote(e, 'up')}
          disabled={voting || !currentUserId || commentId.startsWith('optimistic-')}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors ${
            userVote === 'up' ? 'text-indigo-300' : 'hover:text-indigo-200'
          } ${(!currentUserId || commentId.startsWith('optimistic-')) ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Upvote"
        >
          <span className="text-[10px]">▲</span>
        </button>

        <span
          className={`text-[11px] font-semibold ${
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
          disabled={voting || !currentUserId || commentId.startsWith('optimistic-')}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors ${
            userVote === 'down' ? 'text-red-300' : 'hover:text-slate-200'
          } ${(!currentUserId || commentId.startsWith('optimistic-')) ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Downvote"
        >
          <span className="text-[10px]">▼</span>
        </button>
      </div>

      {onReply && (
        <button
          onClick={onReply}
          className="h-8 rounded-full border border-[#252a31] px-3 text-xs text-slate-200 hover:text-indigo-200"
        >
          Reply
        </button>
      )}
    </div>
  );
}
