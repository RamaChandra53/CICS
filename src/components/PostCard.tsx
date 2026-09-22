'use client';

import { memo, useCallback, useState, useMemo, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { ROOMS } from '@/types';

import HorizontalVoteButtons from './HorizontalVoteButtons';
import { getPostIdentityDisplay } from '@/lib/identityDisplay';
import { createClient } from '@/lib/supabase';

interface PostCardProps {
  post: Post;
  showRoom?: boolean;
  currentUserId?: string | null;
  initialUserVote?: 'up' | 'down' | null;
  onPostUpdate?: (postId: string, updates: { upvotes?: number; downvotes?: number; user_vote?: 'up' | 'down' | null }) => void;
}

// ── Poll Voting Component ────────────────────────────────────
function PollDisplay({ post, currentUserId }: { post: Post; currentUserId?: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [userVotedOption, setUserVotedOption] = useState<number | null>(null);
  const [pollResults, setPollResults] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [voting, setVoting] = useState(false);

  const options = post.poll_options || [];

  // Load poll data on mount
  useMemo(() => {
    if (!options.length || hasLoaded) return;

    const loadPoll = async () => {
      try {
        // Get vote counts
        const { data: votes, error } = await supabase
          .from('poll_votes')
          .select('option_index')
          .eq('post_id', post.id);

        if (error) {
          if (error.code === 'PGRST205') return;
          console.error('Poll votes error:', error);
          return;
        }

        const counts: Record<number, number> = {};
        let total = 0;
        (votes || []).forEach((v: { option_index: number }) => {
          counts[v.option_index] = (counts[v.option_index] || 0) + 1;
          total++;
        });
        setPollResults(counts);
        setTotalVotes(total);

        // Get user's vote
        if (currentUserId) {
          const { data: userVote } = await supabase
            .from('poll_votes')
            .select('option_index')
            .eq('post_id', post.id)
            .eq('user_id', currentUserId)
            .maybeSingle();

          if (userVote) {
            setUserVotedOption(userVote.option_index);
          }
        }
      } catch (err) {
        console.error('Poll load error:', err);
      } finally {
        setHasLoaded(true);
      }
    };

    loadPoll();
  }, [supabase, post.id, currentUserId, options.length, hasLoaded]);

  const handleVote = async (e: MouseEvent, optionIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId || voting || userVotedOption !== null) return;

    setVoting(true);
    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert({ user_id: currentUserId, post_id: post.id, option_index: optionIndex });

      if (error) throw error;

      setUserVotedOption(optionIndex);
      setPollResults(prev => ({
        ...prev,
        [optionIndex]: (prev[optionIndex] || 0) + 1,
      }));
      setTotalVotes(prev => prev + 1);
    } catch (err) {
      console.error('Poll vote error:', err);
    } finally {
      setVoting(false);
    }
  };

  const showResults = userVotedOption !== null || !currentUserId;

  if (!options.length) return null;

  return (
    <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
      {options.map((option, index) => {
        const count = pollResults[index] || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isUserVote = userVotedOption === index;

        return (
          <button
            key={index}
            onClick={(e) => handleVote(e, index)}
            disabled={showResults || voting}
            className={`w-full relative overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
              isUserVote
                ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200'
                : showResults
                ? 'border-[#252a31] text-slate-300'
                : 'border-[#252a31] text-slate-300 hover:border-indigo-500/30 hover:bg-indigo-500/5 cursor-pointer'
            }`}
          >
            {showResults && (
              <div
                className={`absolute inset-y-0 left-0 ${isUserVote ? 'bg-indigo-500/15' : 'bg-[#1f2329]'}`}
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="font-medium">{option}</span>
              {showResults && (
                <span className={`text-xs ${isUserVote ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {percentage}%
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-slate-500 px-1">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {post.poll_expires_at && (
          <span> · Ends {formatTimeAgo(post.poll_expires_at)}</span>
        )}
      </p>
    </div>
  );
}

// ── Link Preview Component ───────────────────────────────────
function LinkPreview({ url }: { url: string }) {
  const [metadata, setMetadata] = useState<{title?: string; description?: string; image?: string} | null>(null);
  const [loaded, setLoaded] = useState(false);

  useMemo(() => {
    if (loaded) return;
    const fetchMeta = async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoaded(true);
      }
    };
    fetchMeta();
  }, [url, loaded]);

  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="mt-3 block overflow-hidden rounded-2xl border border-[#252a31] hover:border-[#353a41] transition-colors"
    >
      {metadata?.image && (
        <div className="max-h-48 overflow-hidden">
          <img src={metadata.image} alt="" className="w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs text-indigo-400 mb-1 truncate">{domain}</p>
        {metadata?.title && (
          <p className="text-sm font-medium text-slate-200 line-clamp-2">{metadata.title}</p>
        )}
        {metadata?.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{metadata.description}</p>
        )}
        {!metadata?.title && !loaded && (
          <div className="animate-pulse">
            <div className="h-3 bg-[#1f2329] rounded w-2/3 mb-1" />
            <div className="h-3 bg-[#1f2329] rounded w-full" />
          </div>
        )}
        {!metadata?.title && loaded && (
          <p className="text-sm text-slate-300 truncate">{url}</p>
        )}
      </div>
    </a>
  );
}

// ── Media Content Component (renders image, video, link, or poll) ─
function PostMedia({ post, currentUserId }: { post: Post; currentUserId?: string | null }) {
  return (
    <>
      {/* Image */}
      {post.image_url && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#252a31]">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Video */}
      {post.video_url && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#252a31]">
          <video
            src={post.video_url}
            controls
            preload="metadata"
            className="w-full max-h-[500px]"
            onClick={e => e.stopPropagation()}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Link Preview */}
      {post.link_url && !post.image_url && (
        <LinkPreview url={post.link_url} />
      )}

      {/* Poll */}
      {post.poll_options && post.poll_options.length > 0 && (
        <PollDisplay post={post} currentUserId={currentUserId} />
      )}
    </>
  );
}

const PostCard = memo(function PostCard({
  post,
  currentUserId,
  initialUserVote,
  onPostUpdate,
}: PostCardProps) {
  const router = useRouter();
  const room = ROOMS.find(r => r.id === post.room);

  // Use centralized identity display utility — never shows roll numbers
  const displayInfo = getPostIdentityDisplay(post.profiles, post.display_mode, post.is_anon_post);

  // Navigate to post detail when clicking anywhere on the card
  const handleCardClick = useCallback(() => {
    router.push(`/post/${post.id}`);
  }, [router, post.id]);

  // Prevent card navigation when interacting with buttons/links
  const stopProp = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);


  const content = post.content ?? '';
  const [headline, ...bodyLines] = content.split('\n');
  const body = bodyLines.join('\n').trim();

  // Post type badge
  const postTypeBadge = post.post_type && post.post_type !== 'text' ? (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
      post.post_type === 'video' ? 'bg-purple-500/20 text-purple-300' :
      post.post_type === 'link' ? 'bg-blue-500/20 text-blue-300' :
      post.post_type === 'poll' ? 'bg-amber-500/20 text-amber-300' :
      post.post_type === 'image' ? 'bg-emerald-500/20 text-emerald-300' :
      'bg-slate-500/20 text-slate-300'
    }`}>
      {post.post_type === 'video' ? '🎬' : post.post_type === 'link' ? '🔗' : post.post_type === 'poll' ? '📊' : '📷'}
    </span>
  ) : null;

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4 overflow-hidden cursor-pointer transition-colors hover:border-[#353a41]"
    >
      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
        <Link
          href={`/room/${room?.id || 'campus'}`}
          onClick={stopProp}
          className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
        >
          {room?.label || post.room || 'general'}
        </Link>
        <span className="text-slate-600">·</span>
        {post.is_anon_post || post.display_mode === 'anonymous' ? (
          <span className="text-slate-300">{displayInfo.displayName}</span>
        ) : (
          <Link
            href={`/user/${post.author_id}`}
            onClick={stopProp}
            className="text-slate-300 hover:text-indigo-300 transition-colors"
          >
            {displayInfo.displayName}
          </Link>
        )}
        {displayInfo.showVerified && (
          <span className="text-[10px] font-semibold text-indigo-300">✓</span>
        )}
        <span className="text-slate-600">·</span>
        <span>{formatTimeAgo(post.created_at)}</span>
        {postTypeBadge}
      </div>

      {/* Title */}
      <h3 className="mt-2 text-base font-semibold text-slate-100 leading-snug break-words">
        {headline.substring(0, 150)}
        {headline.length > 150 && '...'}
      </h3>

      {/* Body */}
      {body && (
        <p className="mt-2 text-sm text-slate-200 leading-relaxed line-clamp-3 break-words">
          {body.substring(0, 300)}
          {body.length > 300 && '...'}
        </p>
      )}

      {/* Media Content */}
      <PostMedia post={post} currentUserId={currentUserId} />

      {/* Horizontal Vote Buttons + Actions */}
      <div className="mt-3 border-t border-[#252a31] pt-3" onClick={stopProp}>
        <HorizontalVoteButtons
          postId={post.id}
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
          commentCount={post.comment_count || 0}
          postContent={content}
          currentUserId={currentUserId}
          initialUserVote={initialUserVote}
          skipSync={currentUserId !== undefined}
          onPostUpdate={onPostUpdate}
        />
      </div>
    </div>
  );
});

export default PostCard;
