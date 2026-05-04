'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

interface VoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
}

type VoteType = 'up' | 'down';

export default function VoteButtons({
  postId,
  initialUpvotes,
  initialDownvotes,
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
  }, [supabase, syncVoteState]);

  useEffect(() => {
    loadVote();
  }, [loadVote]);

  const handleVote = async (e: React.MouseEvent, type: VoteType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId || voting) return;

    const prevUserVote = userVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    setVoting(true);
    setErrorMessage('');

    try {
      if (userVote === type) {
        setUserVote(null);

        if (type === 'up') {
          setUpvotes((v) => Math.max(0, v - 1));
        } else {
          setDownvotes((v) => Math.max(0, v - 1));
        }

        const { error } = await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;
      } else if (userVote === null) {
        setUserVote(type);

        if (type === 'up') {
          setUpvotes((v) => v + 1);
        } else {
          setDownvotes((v) => v + 1);
        }

        const { error } = await supabase.from('post_votes').insert({
          post_id: postId,
          user_id: userId,
          vote_type: type,
        });

        if (error) throw error;
      } else {
        setUserVote(type);

        if (type === 'up') {
          setUpvotes((v) => v + 1);
          setDownvotes((v) => Math.max(0, v - 1));
        } else {
          setDownvotes((v) => v + 1);
          setUpvotes((v) => Math.max(0, v - 1));
        }

        const { error } = await supabase
          .from('post_votes')
          .update({ vote_type: type })
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;
      }

      await syncVoteState(userId);
    } catch (err: unknown) {
      setUserVote(prevUserVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
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
        className="text-[#878a8c] transition-colors duration-200 hover:text-[#ff4500] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Upvote"
      >
        <span
          className={
            userVote === 'up'
              ? 'text-[#ff4500] text-xl leading-none'
              : 'text-[#878a8c] text-xl leading-none'
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
        className="text-[#878a8c] transition-colors duration-200 hover:text-[#7193ff] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Downvote"
      >
        <span
          className={
            userVote === 'down'
              ? 'text-[#7193ff] text-xl leading-none'
              : 'text-[#878a8c] text-xl leading-none'
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
