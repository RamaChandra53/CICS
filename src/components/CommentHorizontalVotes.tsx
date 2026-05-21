'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

interface CommentHorizontalVotesProps {
  commentId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  onReply?: () => void;
}

type VoteType = 'up' | 'down';

export default function CommentHorizontalVotes({
  commentId,
  initialUpvotes,
  initialDownvotes,
  onReply,
}: CommentHorizontalVotesProps) {
  const supabase = useMemo(() => createClient(), []);

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialUpvotes, initialDownvotes]);

  const syncVoteState = useCallback(
    async (currentUserId: string | null) => {
      // Skip vote sync entirely if comment_votes table doesn't exist
      // This prevents repeated failed queries that slow down the app
      return;
    },
    [commentId, supabase]
  );

  const loadVote = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setUserVote(null);
        await syncVoteState(null);
        return;
      }

      setUserId(user.id);
      await syncVoteState(user.id);
    } catch (err: unknown) {
      console.error('Comment vote loading error:', err);
    }
  }, [supabase, syncVoteState]);

  useEffect(() => {
    loadVote();
  }, [loadVote]);

  const handleVote = async (e: React.MouseEvent, type: VoteType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || voting) return;

    // Disable comment voting until table is created
    // This prevents database errors and performance issues
    return;

    const prevUserVote = userVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    setVoting(true);

    try {
      // Local state updates only for now
      if (userVote === type) {
        setUserVote(null);
        if (type === 'up') {
          setUpvotes((v) => Math.max(0, v - 1));
        } else {
          setDownvotes((v) => Math.max(0, v - 1));
        }
      } else if (userVote === null) {
        setUserVote(type);
        if (type === 'up') {
          setUpvotes((v) => v + 1);
        } else {
          setDownvotes((v) => v + 1);
        }
      } else {
        setUserVote(type);
        if (type === 'up') {
          setUpvotes((v) => v + 1);
          setDownvotes((v) => Math.max(0, v - 1));
        } else {
          setDownvotes((v) => v + 1);
          setUpvotes((v) => Math.max(0, v - 1));
        }
      }
    } catch (err: unknown) {
      setUserVote(prevUserVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
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
          disabled={voting || !userId}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors ${
            userVote === 'up' ? 'text-indigo-300' : 'hover:text-indigo-200'
          } ${!userId ? 'cursor-not-allowed opacity-50' : ''}`}
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
          disabled={voting || !userId}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors ${
            userVote === 'down' ? 'text-red-300' : 'hover:text-slate-200'
          } ${!userId ? 'cursor-not-allowed opacity-50' : ''}`}
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
