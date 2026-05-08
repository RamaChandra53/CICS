'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';

interface HorizontalVoteButtonsProps {
  postId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  commentCount?: number;
  showActions?: boolean;
  postContent?: string;
}

type VoteType = 'up' | 'down';

export default function HorizontalVoteButtons({
  postId,
  initialUpvotes,
  initialDownvotes,
  commentCount = 0,
  showActions = true,
  postContent = '',
}: HorizontalVoteButtonsProps) {
  const supabase = useMemo(() => createClient(), []);

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

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
      console.error('Vote loading error:', err);
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
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-3">
      {/* Combined vote button */}
      <div className="flex items-center gap-1 rounded-full bg-[#282828] px-2 py-1">
        {/* Upvote arrow */}
        <button
          onClick={(e) => handleVote(e, 'up')}
          disabled={voting || !userId}
          className={`p-1 text-white transition-colors ${
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
          className={`p-1 text-white transition-colors ${
            userVote === 'down' 
              ? 'text-blue-500' 
              : 'hover:text-blue-400'
          } ${!userId ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label="Downvote"
        >
          <span className="text-xs">▼</span>
        </button>
      </div>

      {/* Actions */}
      {showActions && (
        <>
          <button className="flex items-center gap-1 rounded-full bg-[#282828] px-2 py-1 text-white hover:bg-[#383838] transition-colors">
            <span className="text-xs">💬</span>
            <span className="text-xs">{commentCount} Comments</span>
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full bg-[#282828] px-2 py-1 text-white hover:bg-[#383838] transition-colors"
          >
            <span className="text-xs">↗</span>
            <span className="text-xs">Share</span>
          </button>
          <button className="rounded-full bg-[#282828] p-1 text-white hover:bg-[#383838] transition-colors">
            <span className="text-xs">🚩</span>
          </button>
        </>
      )}
    </div>
  );
}
