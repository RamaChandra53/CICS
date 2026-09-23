'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { fetchPollState, submitPollVote, type PollState } from '@/lib/services/polls';

export function usePoll(postId: string, optionsLength: number, currentUserId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<PollState>({
    userVotedOption: null,
    results: {},
    totalVotes: 0,
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!optionsLength) return;

    let cancelled = false;

    const loadPoll = async () => {
      try {
        const nextState = await fetchPollState(supabase, postId, currentUserId);
        if (!cancelled) {
          setState(nextState);
        }
      } catch (err) {
        console.error('Poll load error:', err);
      } finally {
        if (!cancelled) {
          setHasLoaded(true);
        }
      }
    };

    loadPoll();

    return () => {
      cancelled = true;
    };
  }, [supabase, postId, currentUserId, optionsLength]);

  const vote = useCallback(
    async (optionIndex: number) => {
      if (!currentUserId || voting || state.userVotedOption !== null) return;

      setVoting(true);
      try {
        await submitPollVote(supabase, postId, currentUserId, optionIndex);
        setState((prev) => ({
          userVotedOption: optionIndex,
          results: {
            ...prev.results,
            [optionIndex]: (prev.results[optionIndex] ?? 0) + 1,
          },
          totalVotes: prev.totalVotes + 1,
        }));
      } catch (err) {
        console.error('Poll vote error:', err);
      } finally {
        setVoting(false);
      }
    },
    [currentUserId, postId, state.userVotedOption, supabase, voting]
  );

  return {
    ...state,
    hasLoaded,
    voting,
    vote,
  };
}
