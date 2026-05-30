'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

interface VoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote?: VoteType | null;
  currentUserId?: string | null;
  skipSync?: boolean;
  onPostUpdate?: (postId: string, updates: { upvotes: number; downvotes: number; user_vote: VoteType | null }) => void;
}

type VoteType = 'up' | 'down';

export default function VoteButtons({
  postId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
  currentUserId,
  skipSync = false,
  onPostUpdate,
}: VoteButtonsProps) {
  const supabase = useMemo(() => createClient(), []);

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;

    if (typeof err === 'object' && err !== null) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }

    return 'Failed to record vote. Please try again.';
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
      if (currentUserId !== undefined) {
        setUserId(currentUserId);
        setUserVote(initialUserVote ?? null);
        await syncVoteState(currentUserId);
        setErrorMessage('');
        return;
      }

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
      setErrorMessage('');
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err));
    }
  }, [supabase, syncVoteState, currentUserId, initialUserVote]);

  useEffect(() => {
    if (skipSync) return;
    loadVote();
  }, [loadVote, skipSync]);

  useEffect(() => {
    if (!skipSync) return;
    setUserId(currentUserId ?? null);
    setUserVote(initialUserVote ?? null);
  }, [currentUserId, initialUserVote, skipSync]);

  const handleVote = async (e: React.MouseEvent, type: VoteType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || voting) return;

    const prevUserVote = userVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    setVoting(true);
    setErrorMessage('');

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
          .eq('user_id', userId);

        if (error) throw error;
      } else if (userVote === null) {
        const nextVote = type;
        const nextUpvotes = type === 'up' ? upvotes + 1 : upvotes;
        const nextDownvotes = type === 'down' ? downvotes + 1 : downvotes;
        applyOptimisticUpdate(nextVote, nextUpvotes, nextDownvotes);

        const { error } = await supabase.from('post_votes').insert({
          post_id: postId,
          user_id: userId,
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
          .eq('user_id', userId);

        if (error) throw error;
      }

      if (!skipSync) {
        await syncVoteState(userId);
      }
    } catch (err: unknown) {
      applyOptimisticUpdate(prevUserVote, prevUpvotes, prevDownvotes);
      setErrorMessage(getErrorMessage(err));
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: '40px' }}>
      <button
        onClick={(e) => handleVote(e, 'up')}
        disabled={voting || !userId}
        className="text-slate-500 transition-colors duration-200 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Upvote"
      >
        <span
          className={
            userVote === 'up'
              ? 'text-indigo-400 text-xl leading-none'
              : 'text-slate-500 text-xl leading-none'
          }
        >
          ▲
        </span>
      </button>

      <div className="min-h-[20px] text-center text-sm font-bold text-white">
        {upvotes - downvotes}
      </div>

      <button
        onClick={(e) => handleVote(e, 'down')}
        disabled={voting || !userId}
        className="text-slate-500 transition-colors duration-200 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Downvote"
      >
        <span
          className={
            userVote === 'down'
              ? 'text-red-400 text-xl leading-none'
              : 'text-slate-500 text-xl leading-none'
          }
        >
          ▼
        </span>
      </button>

      {errorMessage && (
        <p className="mt-1 text-center text-xs text-red-500">{errorMessage}</p>
      )}
    </div>
  );
}
