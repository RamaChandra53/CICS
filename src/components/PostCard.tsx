'use client';

import { memo, useCallback } from 'react';
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

  // Memoize vote handlers to prevent unnecessary re-renders
  const handleVote = useCallback((e: React.MouseEvent, type: 'up' | 'down') => {
    // Vote handling is done in VoteButtons component
  }, []);

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
          showVerified: true
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

  return (
    <div className="glass rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-neon group">
      <div className="flex">
        {/* Vote Column */}
        <div className="w-12 bg-bg-secondary/50 flex flex-col items-center py-3 border-r border-border-primary">
          <VoteButtons 
            postId={post.id} 
            initialUpvotes={post.upvotes} 
            initialDownvotes={post.downvotes}
            currentUserId={currentUserId}
            initialUserVote={initialUserVote}
            skipSync={currentUserId !== undefined}
          />
        </div>

        {/* Content Column */}
        <div className="flex-1 p-4">
          {/* Community and Meta */}
          <div className="flex items-center text-xs text-text-muted mb-2">
            <Link 
              href={`/room/${room?.id || 'campus'}`}
              className="font-bold text-accent-primary hover:text-accent-secondary transition-colors cursor-pointer neon-text"
            >
              campus/{room?.label || 'general'}
            </Link>
            <span className="mx-2 text-text-muted/50">•</span>
            <span className="text-text-muted">Posted by 
              <span className={`ml-1 font-medium ${displayInfo.showVerified ? 'text-accent-primary' : 'text-text-secondary'}`}>
                {displayInfo.displayName}
              </span>
            </span>
            {displayInfo.showVerified && (
              <span className="text-warning ml-1" title="Verified User">✓</span>
            )}
            <span className="mx-2 text-text-muted/50">•</span>
            <span className="text-text-muted">{formatTimeAgo(post.created_at)}</span>
          </div>

          {/* Post Title */}
          <Link href={`/post/${post.id}`} className="block group">
            <h3 className="text-text-primary text-lg font-semibold mb-2 group-hover:text-accent-primary transition-colors line-clamp-2">
              {post.content.split('\n')[0].substring(0, 150)}
              {post.content.split('\n')[0].length > 150 && '...'}
            </h3>
          </Link>

          {/* Post Body Preview */}
          {post.content.includes('\n') && (
            <p className="text-text-secondary text-sm mb-3 line-clamp-3 font-mono bg-bg-secondary/30 rounded-lg p-2">
              {post.content.split('\n').slice(1).join('\n').substring(0, 300)}
              {post.content.split('\n').slice(1).join('\n').length > 300 && '...'}
            </p>
          )}

          {/* Post Image */}
          {post.image_url && (
            <div className="mb-3 rounded-xl overflow-hidden transform transition-transform duration-300 group-hover:scale-[1.02]">
              <img 
                src={post.image_url} 
                alt="Post image" 
                className="w-full object-cover rounded-xl"
                loading="lazy"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 text-xs text-text-muted mt-3 pt-3 border-t border-border-primary">
            <button aria-label="View comments" className="flex items-center gap-1 hover:text-accent-primary transition-all duration-300 transform hover:scale-110">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h7m-9 8 3.5-3H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2v3z" />
              </svg>
              <span>{post.comment_count || 0} Comments</span>
            </button>
            <button 
              onClick={handleShare}
              aria-label="Share post"
              className="flex items-center gap-1 hover:text-accent-primary transition-all duration-300 transform hover:scale-110"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17 17 7m0 0H9m8 0v8" />
              </svg>
              <span>Share</span>
            </button>
            <button aria-label="Report post" className="flex items-center gap-1 hover:text-error transition-all duration-300 transform hover:scale-110">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v18m0-12h12l-2 3 2 3H5" />
              </svg>
              <span>Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PostCard;
