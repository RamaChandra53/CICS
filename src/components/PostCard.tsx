'use client';

import { memo, useCallback, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { ROOMS } from '@/types';
import VoteButtons from './VoteButtons';
import { getPostIdentityDisplay } from '@/lib/identityDisplay';

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
  const router = useRouter();
  const room = ROOMS.find(r => r.id === post.room);

  // Use centralized identity display utility — never shows roll numbers
  const displayInfo = getPostIdentityDisplay(post.profiles, post.display_mode);

  // Bookmark local-only state
  // TODO: Wire to bookmark/save backend when persistence is implemented
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Navigate to post detail when clicking anywhere on the card
  const handleCardClick = useCallback(() => {
    router.push(`/post/${post.id}`);
  }, [router, post.id]);

  // Prevent card navigation when interacting with buttons/links
  const stopProp = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Share functionality
  const handleShare = useCallback(async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareText = post.content.split('\n')[0].substring(0, 100);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CICS Post',
          text: shareText,
          url: postUrl
        });
      } catch (error) {
        // User cancelled or share failed — fallback to clipboard
        if ((error as Error)?.name !== 'AbortError') {
          await copyToClipboard(postUrl);
        }
      }
    } else {
      await copyToClipboard(postUrl);
    }
  }, [post.id, post.content]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const content = post.content ?? '';
  const [headline, ...bodyLines] = content.split('\n');
  const body = bodyLines.join('\n').trim();

  return (
    <div
      onClick={handleCardClick}
      className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4 overflow-hidden cursor-pointer transition-colors hover:border-[#353a41]"
    >
      {/* Mobile layout: content left, votes right */}
      <div className="flex gap-3 md:hidden">
        {/* Left: content area */}
        <div className="min-w-0 flex-1">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link
              href={`/room/${room?.id || 'campus'}`}
              onClick={stopProp}
              className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
            >
              {room?.label || 'general'}
            </Link>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">{displayInfo.displayName}</span>
            {displayInfo.showVerified && (
              <span className="text-[10px] font-semibold text-indigo-300">✓</span>
            )}
            <span className="text-slate-600">·</span>
            <span>{formatTimeAgo(post.created_at)}</span>
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

          {/* Action row: Bookmark, Comment, Share */}
          <div className="mt-3 flex items-center border-t border-[#252a31] pt-3" onClick={stopProp}>
            <div className="grid grid-cols-3 w-full gap-1">
              {/* Bookmark */}
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isBookmarked
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2329]'
                }`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                <svg className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Save</span>
              </button>

              {/* Comment */}
              <Link
                href={`/post/${post.id}`}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1f2329] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h7m-9 8 3.5-3H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2v3z" />
                </svg>
                <span>{post.comment_count || 0}</span>
              </Link>

              {/* Share */}
              <button
                onClick={handleShare}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#1f2329] transition-colors"
                aria-label="Share post"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17 17 7m0 0H9m8 0v8" />
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: vertical vote controls */}
        <div className="w-10 shrink-0 flex justify-center pt-1" onClick={stopProp}>
          <VoteButtons
            postId={post.id}
            initialUpvotes={post.upvotes}
            initialDownvotes={post.downvotes}
            currentUserId={currentUserId}
            initialUserVote={initialUserVote}
            skipSync={currentUserId !== undefined}
          />
        </div>
      </div>

      {/* Desktop layout: votes left, content right */}
      <div className="hidden md:flex md:gap-4">
        <div className="md:flex md:w-12 md:justify-center" onClick={stopProp}>
          <VoteButtons
            postId={post.id}
            initialUpvotes={post.upvotes}
            initialDownvotes={post.downvotes}
            currentUserId={currentUserId}
            initialUserVote={initialUserVote}
            skipSync={currentUserId !== undefined}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link
              href={`/room/${room?.id || 'campus'}`}
              onClick={stopProp}
              className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
            >
              {room?.label || 'general'}
            </Link>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">{displayInfo.displayName}</span>
            {displayInfo.showVerified && (
              <span className="text-[10px] font-semibold text-indigo-300">✓</span>
            )}
            <span className="text-slate-600">·</span>
            <span>{formatTimeAgo(post.created_at)}</span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-100 leading-snug">
            {headline.substring(0, 150)}
            {headline.length > 150 && '...'}
          </h3>

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

          {/* Desktop action row */}
          <div className="mt-3 flex items-center gap-3 border-t border-[#252a31] pt-3 text-xs text-slate-400" onClick={stopProp}>
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`flex items-center gap-2 rounded-full border border-[#252a31] px-3 py-2 text-xs transition-colors ${
                isBookmarked
                  ? 'text-indigo-300 border-indigo-500/40'
                  : 'text-slate-300 hover:text-indigo-300'
              }`}
            >
              <svg className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
});

export default PostCard;
