'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { ROOMS } from '@/types';
import VoteButtons from './VoteButtons';

interface PostCardProps {
  post: Post;
  showRoom?: boolean;
  currentUserId?: string | null;
  initialUserVote?: 'up' | 'down' | null;
  onPostUpdate?: (postId: string, updates: { upvotes?: number; downvotes?: number; user_vote?: 'up' | 'down' | null }) => void;
}

const PostCard = memo(function PostCard({
  post,
  showRoom = false,
  currentUserId,
  initialUserVote,
  onPostUpdate,
}: PostCardProps) {
  const author = post.profiles;
  const displayMode = post.display_mode || (post.is_anon_post ? 'anonymous' : 'full');
  const room = ROOMS.find(r => r.id === post.room);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Share functionality
  const handleShare = useCallback(async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareText = post.content.split('\n')[0].substring(0, 100);
    
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
  }, [post.id, post.content]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success feedback (you could add a toast here)
      console.log('Post link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Determine display based on display_mode
  const getDisplayInfo = () => {
    switch (displayMode) {
      case 'full': {
        const rollInfo = author?.roll_number
          ? `${author.roll_number} · ${author?.branch || 'Unknown'} · ${author?.year || 'Unknown'}`
          : author?.username ?? 'Anonymous';
        return {
          displayName: rollInfo,
          avatar: author?.username?.[0]?.toUpperCase() ?? '?',
          avatarBg: 'bg-indigo-600/30 text-indigo-400',
          showVerified: author?.is_verified || false
        };
      }
      case 'partial':
        return {
          displayName: `${author?.branch || ''}_${author?.year || ''}`,
          avatar: author?.branch?.[0] || '?',
          avatarBg: 'bg-purple-600/30 text-purple-400',
          showVerified: !!(author?.is_email_verified || author?.is_verified)
        };
      case 'anonymous':
        return {
          displayName: '👻 Anonymous',
          avatar: '👻',
          avatarBg: 'bg-gray-700 text-gray-400',
          showVerified: false
        };
      default:
        return {
          displayName: author?.username ?? 'Anonymous',
          avatar: author?.username?.[0]?.toUpperCase() ?? '?',
          avatarBg: 'bg-indigo-600/30 text-indigo-400',
          showVerified: author?.is_verified || false
        };
    }
  };

  const displayInfo = getDisplayInfo();
  const content = post.content ?? '';
  const [headline, ...bodyLines] = content.split('\n');
  const body = bodyLines.join('\n').trim();

  return (
    <div className="relative w-full rounded-2xl border border-[#252a31] bg-[#15181c] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link
              href={`/room/${room?.id || 'campus'}`}
              className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
            >
              campus/{room?.label || 'general'}
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">{displayInfo.displayName}</span>
            {displayInfo.showVerified && (
              <span className="text-[10px] font-semibold text-indigo-300">✓</span>
            )}
            <span className="text-slate-600">•</span>
            <span>{formatTimeAgo(post.created_at)}</span>
          </div>

          <Link href={`/post/${post.id}`} className="block min-w-0">
            <h3 className="mt-2 text-base font-semibold text-slate-100 leading-snug break-words">
              {headline.substring(0, 150)}
              {headline.length > 150 && '...'}
            </h3>
          </Link>

          {body && (
            <p className="mt-2 text-sm text-slate-200 leading-relaxed line-clamp-3 break-words">
              {body.substring(0, 300)}
              {body.length > 300 && '...'}
            </p>
          )}

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

          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
            <button
              type="button"
              onClick={() => {
                // TODO: Persist bookmarks when backend support is available.
                setIsBookmarked((prev) => !prev);
              }}
              className={`flex h-10 items-center justify-center gap-1 rounded-full border px-2 font-medium transition-colors ${
                isBookmarked
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                  : 'border-[#252a31] bg-[#0f1318] text-slate-300 hover:text-indigo-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4-7 4V5z" />
              </svg>
              <span className="truncate">Bookmark</span>
            </button>

            <Link
              href={`/post/${post.id}`}
              className="flex h-10 items-center justify-center gap-1 rounded-full border border-[#252a31] bg-[#0f1318] px-2 font-medium text-slate-300 transition-colors hover:text-indigo-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h7m-9 8 3.5-3H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2v3z" />
              </svg>
              <span className="truncate">Comment</span>
            </Link>

            <button
              type="button"
              onClick={handleShare}
              className="flex h-10 items-center justify-center gap-1 rounded-full border border-[#252a31] bg-[#0f1318] px-2 font-medium text-slate-300 transition-colors hover:text-indigo-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17 17 7m0 0H9m8 0v8" />
              </svg>
              <span className="truncate">Share</span>
            </button>
          </div>
        </div>

        <div className="flex shrink-0 justify-end">
          <VoteButtons
            postId={post.id}
            initialUpvotes={post.upvotes}
            initialDownvotes={post.downvotes}
            currentUserId={currentUserId}
            initialUserVote={initialUserVote}
            skipSync={currentUserId !== undefined}
            onPostUpdate={onPostUpdate}
          />
        </div>
      </div>
    </div>
  );
});

export default PostCard;
