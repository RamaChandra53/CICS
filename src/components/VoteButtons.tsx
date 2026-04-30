'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

interface VoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
}

export default function VoteButtons({ postId, initialUpvotes, initialDownvotes }: VoteButtonsProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
    return 'Failed to record vote. Please try again.';
  };

  useEffect(() => {
    setUpvotes(initialUpvotes);
    setDownvotes(initialDownvotes);
  }, [initialUpvotes, initialDownvotes]);

  const syncVoteState = useCallback(async (currentUserId: string | null) => {
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
    if (voteQuery?.error) throw voteQuery.error;

    setUpvotes(upvoteQuery.count ?? 0);
    setDownvotes(downvoteQuery.count ?? 0);
    setUserVote((voteQuery?.data?.vote_type as 'up' | 'down' | undefined) ?? null);
  }, [postId, supabase]);

  const loadVote = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

  const handleVote = async (e: React.MouseEvent, type: 'up' | 'down') => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId || voting) return;

    setVoting(true);

    // Capture previous state for rollback
    const prevUserVote = userVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    try {
      setErrorMessage('');
      if (userVote === type) {
        // Toggle off: remove vote — optimistic update first
        setUserVote(null);
        if (type === 'up') setUpvotes(v => Math.max(0, v - 1));
        else setDownvotes(v => Math.max(0, v - 1));

        const { error } = await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) throw error;
        await syncVoteState(userId);
      } else if (userVote === null) {
        // New vote — optimistic update first
        setUserVote(type);
        if (type === 'up') setUpvotes(v => v + 1);
        else setDownvotes(v => v + 1);

        const { error } = await supabase
          .from('post_votes')
          .insert({ post_id: postId, user_id: userId, vote_type: type });
        if (error) throw error;
        await syncVoteState(userId);
      } else {
        // Switch vote — optimistic update first
        setUserVote(type);
        if (type === 'up') {
          setUpvotes(v => v + 1);
          setDownvotes(v => Math.max(0, v - 1));
        } else {
          setDownvotes(v => v + 1);
          setUpvotes(v => Math.max(0, v - 1));
        }

        const { error } = await supabase
          .from('post_votes')
          .update({ vote_type: type })
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) throw error;
        await syncVoteState(userId);
      }
    } catch (err: unknown) {
      // Roll back optimistic updates on failure
      setUserVote(prevUserVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setErrorMessage(getErrorMessage(err));
    } finally {
      setVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div
      className="flex items-center gap-1"
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      <button
        onClick={e => handleVote(e, 'up')}
        disabled={voting}
        className="text-base leading-none transition-colors disabled:opacity-50 hover:opacity-80"
        style={{ color: userVote === 'up' ? '#ff4500' : '#6b7280' }}
        aria-label="Upvote"
      >
        ▲
      </button>
      <span className="text-xs font-medium tabular-nums" style={{ color: score > 0 ? '#ff4500' : score < 0 ? '#7193ff' : '#6b7280' }}>
        {score}
      </span>
      <button
        onClick={e => handleVote(e, 'down')}
        disabled={voting}
        className="text-base leading-none transition-colors disabled:opacity-50 hover:opacity-80"
        style={{ color: userVote === 'down' ? '#7193ff' : '#6b7280' }}
        aria-label="Downvote"
      >
        ▼
      </button>
      {errorMessage && (
        <span className="ml-2 text-[10px] text-red-400 whitespace-nowrap">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
