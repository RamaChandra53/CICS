import type { Post } from '@/types';

const CACHE_TTL_MS = 60_000;

type CachedPost = {
  post: Post;
  expiresAt: number;
};

const postPreviewCache = new Map<string, CachedPost>();

export function cachePostPreview(post: Post) {
  postPreviewCache.set(post.id, {
    post,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function getCachedPostPreview(postId: string): Post | null {
  const cached = postPreviewCache.get(postId);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    postPreviewCache.delete(postId);
    return null;
  }

  return cached.post;
}
