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
    <div className="flex items-center gap-2">
      {/* Combined vote button */}
      <div className="flex items-center gap-0.5 rounded-full bg-[#282828] px-1.5 py-0.5">
        {/* Upvote arrow */}
        <button
          onClick={(e) => handleVote(e, 'up')}
          disabled={voting || !userId}
          className={`p-0.5 text-white transition-colors ${
            userVote === 'up' 
              ? 'text-orange-500' 
              : 'hover:text-orange-400'
          } ${!userId ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Upvote"
        >
          <span className="text-xs">▲</span>
        </button>
        
        {/* Score */}
        <span className={`text-xs font-medium ${
          userVote === 'up' ? 'text-orange-500' : 
          userVote === 'down' ? 'text-blue-500' : 
          'text-white'
        }`}>
          {score}
        </span>
        
        {/* Downvote arrow */}
        <button
          onClick={(e) => handleVote(e, 'down')}
          disabled={voting || !userId}
          className={`p-0.5 text-white transition-colors ${
            userVote === 'down' 
              ? 'text-blue-500' 
              : 'hover:text-blue-400'
          } ${!userId ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Downvote"
        >
          <span className="text-xs">▼</span>
        </button>
      </div>

      {/* Reply button */}
      {onReply && (
        <button
          onClick={onReply}
          className="rounded-full bg-[#282828] px-2 py-1 text-xs text-white hover:bg-[#383838] transition-colors"
        >
          Reply
        </button>
      )}
    </div>
  );
}
