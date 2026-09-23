'use client';

import { memo, useCallback, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';

import HorizontalVoteButtons from './HorizontalVoteButtons';
import { getPostIdentityDisplay } from '@/lib/identityDisplay';
import { fallbackCommunities, getCommunityLabel } from '@/lib/services/communities';
import LinkPreview from './post/LinkPreview';
import PollDisplay from './post/PollDisplay';
import { cachePostPreview } from '@/lib/postPreviewCache';

interface PostCardProps {
  post: Post;
  showRoom?: boolean;
  currentUserId?: string | null;
  initialUserVote?: 'up' | 'down' | null;
  onPostUpdate?: (postId: string, updates: { upvotes?: number; downvotes?: number; user_vote?: 'up' | 'down' | null }) => void;
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
        <PollDisplay
          postId={post.id}
          options={post.poll_options}
          expiresAt={post.poll_expires_at}
          currentUserId={currentUserId}
        />
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
  const roomLabel = getCommunityLabel(post.community_slug ?? post.room, fallbackCommunities());
  const roomHref = post.community_slug ?? post.room ?? 'campus';

  // Use centralized identity display utility — never shows roll numbers
  const displayInfo = getPostIdentityDisplay(post.profiles, post.display_mode, post.is_anon_post);

  // Navigate to post detail when clicking anywhere on the card
  const handleCardClick = useCallback(() => {
    cachePostPreview(post);
    window.dispatchEvent(new Event('cics-route-start'));
    router.push(`/post/${post.id}`);
  }, [router, post]);

  const prefetchPost = useCallback(() => {
    cachePostPreview(post);
    router.prefetch(`/post/${post.id}`);
  }, [router, post]);

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
      onMouseEnter={prefetchPost}
      onTouchStart={prefetchPost}
      className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4 overflow-hidden cursor-pointer transition-colors hover:border-[#353a41]"
    >
      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
        <Link
          href={`/room/${roomHref}`}
          onClick={stopProp}
          className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
        >
          {roomLabel}
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
