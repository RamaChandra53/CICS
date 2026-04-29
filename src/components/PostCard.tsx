'use client';

import Link from 'next/link';
import { Post } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { ROOMS } from '@/types';

interface PostCardProps {
  post: Post;
  showRoom?: boolean;
}

export default function PostCard({ post, showRoom = false }: PostCardProps) {
  const author = post.profiles;
  const displayName = post.is_anon_post ? 'Anonymous' : (author?.username ?? 'Anonymous');
  const isVerified = !post.is_anon_post && author?.is_verified;
  const room = ROOMS.find(r => r.id === post.room);

  return (
    <Link
      href={`/post/${post.id}`}
      className="block bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4 hover:border-gray-700/80 hover:bg-[#1e1e1e] transition-colors cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
            post.is_anon_post ? 'bg-gray-700 text-gray-400' : 'bg-indigo-600/30 text-indigo-400'
          }`}>
            {post.is_anon_post ? '👻' : (displayName[0]?.toUpperCase() ?? '?')}
          </div>

          {/* Username + badge */}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white text-sm font-medium">{displayName}</span>
              {isVerified && (
                <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                  ✓ verified
                </span>
              )}
              {!post.is_anon_post && author?.is_anonymous && (
                <span className="text-gray-500 text-xs">· anon</span>
              )}
            </div>
            <p className="text-gray-500 text-[11px]">{formatTimeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* Room tag */}
        {showRoom && room && (
          <span className="text-[11px] bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
            {room.icon} {room.label}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-gray-200 text-sm leading-relaxed line-clamp-4">{post.content}</p>

      {/* Post image */}
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt="Post image"
          className="mt-3 rounded-xl w-full object-cover max-h-64"
        />
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800/40">
        <span className="text-gray-500 text-xs flex items-center gap-1">
          💬 {post.comment_count ?? 0} comment{post.comment_count !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}
