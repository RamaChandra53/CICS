'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

interface VoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote?: 'up' | 'down' | null;
}

export default function VoteButtons({ postId, initialUpvotes, initialDownvotes, initialUserVote }: VoteButtonsProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote ?? null);
  const [userId, setUserId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const loadVote = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    // Only fetch user vote from DB if it wasn't provided via props
    if (initialUserVote === undefined) {
      const { data } = await supabase
        .from('post_votes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setUserVote(data.vote_type as 'up' | 'down');
      }
    }
  }, [postId, supabase, initialUserVote]);

  useEffect(() => {
    loadVote();
  }, [loadVote]);

  const syncCounts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single();
    if (data) {
      setUpvotes(data.upvotes);
      setDownvotes(data.downvotes);
    }
  }, [postId, supabase]);

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
      } else if (userVote === null) {
        // New vote — optimistic update first
        setUserVote(type);
        if (type === 'up') setUpvotes(v => v + 1);
        else setDownvotes(v => v + 1);

        const { error } = await supabase
          .from('post_votes')
          .insert({ post_id: postId, user_id: userId, vote_type: type });
        if (error) throw error;
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
      }
      // Sync with actual DB values after the trigger has updated the counts
      await syncCounts();
    } catch {
      // Roll back optimistic updates on failure
      setUserVote(prevUserVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
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
    </div>
  );
}
