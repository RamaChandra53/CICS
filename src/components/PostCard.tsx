'use client';

import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { ROOMS } from '@/types';
import VoteButtons from './VoteButtons';

interface PostCardProps {
  post: Post;
  showRoom?: boolean;
}

export default function PostCard({ post, showRoom = false }: PostCardProps) {
  const author = post.profiles;
  const displayMode = post.display_mode || 'full';
  const room = ROOMS.find(r => r.id === post.room);

  // Determine display based on display_mode
  const getDisplayInfo = () => {
    switch (displayMode) {
      case 'full':
        return {
          displayName: author?.roll_number ? `${author.roll_number}` : (author?.username ?? 'Anonymous'),
          avatar: author?.username?.[0]?.toUpperCase() ?? '?',
          avatarBg: 'bg-indigo-600/30 text-indigo-400',
          showVerified: author?.is_verified || false
        };
      case 'partial':
        return {
          displayName: `${author?.year || ''} • ${author?.branch || ''}`,
          avatar: author?.year?.[0] || '?',
          avatarBg: 'bg-purple-600/30 text-purple-400',
          showVerified: false
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
    <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] flex">
      {/* Vote Column */}
      <div className="w-10 bg-[#161617] flex flex-col items-center py-2">
        <VoteButtons 
          postId={post.id} 
          initialUpvotes={post.upvotes} 
          initialDownvotes={post.downvotes} 
        />
      </div>

      {/* Content Column */}
      <div className="flex-1 p-2">
        {/* Community and Meta */}
        <div className="flex items-center text-xs text-gray-400 mb-1">
          <span className="font-bold text-[#0079d3] hover:underline cursor-pointer">
            r/{room?.label || 'campus'}
          </span>
          <span className="mx-1">•</span>
          <span>Posted by {displayInfo.displayName}</span>
          <span className="mx-1">•</span>
          <span>{formatTimeAgo(post.created_at)}</span>
          {displayInfo.showVerified && (
            <span className="text-orange-500 ml-1">✓</span>
          )}
        </div>

        {/* Post Title */}
        <Link href={`/post/${post.id}`} className="block">
          <h3 className="text-[#d7dadc] text-lg font-medium mb-1 hover:underline">
            {post.content.split('\n')[0].substring(0, 100)}...
          </h3>
        </Link>

        {/* Post Body Preview */}
        {post.content.includes('\n') && (
          <p className="text-[#d7dadc] text-sm mb-2 line-clamp-3">
            {post.content.split('\n').slice(1).join('\n').substring(0, 200)}...
          </p>
        )}

        {/* Post Image */}
        {post.image_url && (
          <div className="mb-2">
            <img 
              src={post.image_url} 
              alt="Post image" 
              className="max-w-full rounded-lg"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <button className="hover:text-[#d7dadc] transition-colors">
            💬 Comments
          </button>
          <button className="hover:text-[#d7dadc] transition-colors">
            ↗ Share
          </button>
          <button className="hover:text-[#d7dadc] transition-colors">
            🚩 Report
          </button>
        </div>
      </div>
    </div>
  );
}
