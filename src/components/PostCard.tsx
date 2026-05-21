'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { ROOMS } from '@/types';
import HorizontalVoteButtons from './HorizontalVoteButtons';
import VoteButtons from './VoteButtons';

interface PostCardProps {
  post: Post;
  showRoom?: boolean;
  currentUserId?: string | null;
  initialUserVote?: 'up' | 'down' | null;
}

const PostCard = memo(function PostCard({
  post,
  showRoom = false,
  currentUserId,
  initialUserVote,
}: PostCardProps) {
  const author = post.profiles;
  const displayMode = post.display_mode || (post.is_anon_post ? 'anonymous' : 'full');
  const room = ROOMS.find(r => r.id === post.room);

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
    <div className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4">
      <div className="md:flex md:gap-4">
        <div className="hidden md:flex md:w-12 md:justify-center">
          <VoteButtons
            postId={post.id}
            initialUpvotes={post.upvotes}
            initialDownvotes={post.downvotes}
            currentUserId={currentUserId}
            initialUserVote={initialUserVote}
            skipSync={currentUserId !== undefined}
          />
        </div>

        <div className="flex-1">
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

          <Link href={`/post/${post.id}`} className="block">
            <h3 className="mt-2 text-base font-semibold text-slate-100 leading-snug">
              {headline.substring(0, 150)}
              {headline.length > 150 && '...'}
            </h3>
          </Link>

          {body && (
            <p className="mt-2 text-sm text-slate-200 leading-relaxed line-clamp-3">
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

          <div className="mt-3">
            <div className="md:hidden">
              <HorizontalVoteButtons
                postId={post.id}
                initialUpvotes={post.upvotes}
                initialDownvotes={post.downvotes}
                commentCount={post.comment_count || 0}
                postContent={content}
              />
            </div>

            <div className="hidden md:flex items-center gap-3 border-t border-[#252a31] pt-3 text-xs text-slate-400">
              <Link
                href={`/post/${post.id}`}
                className="flex items-center gap-2 rounded-full border border-[#252a31] px-3 py-2 text-xs text-slate-300 hover:text-indigo-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h7m-9 8 3.5-3H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2v3z" />
                </svg>
                <span>{post.comment_count || 0}</span>
              </Link>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-full border border-[#252a31] px-3 py-2 text-xs text-slate-300 hover:text-indigo-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17 17 7m0 0H9m8 0v8" />
                </svg>
                Share
              </button>
              <button
                aria-label="Report post"
                className="flex items-center gap-2 rounded-full border border-[#252a31] px-3 py-2 text-xs text-slate-300 hover:text-red-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v18m0-12h12l-2 3 2 3H5" />
                </svg>
                Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PostCard;
