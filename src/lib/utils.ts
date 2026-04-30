import { Post } from '@/types';

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function generateAnonUsername(): string {
  const adjectives = ['Red', 'Blue', 'Green', 'Purple', 'Gold', 'Silver', 'Dark', 'Bright', 'Swift', 'Bold'];
  const animals = ['Panda', 'Falcon', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Hawk', 'Bear', 'Lion', 'Shark'];
  const pickIndex = (max: number) => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  };
  const adj = adjectives[pickIndex(adjectives.length)];
  const animal = animals[pickIndex(animals.length)];
  const num = pickIndex(100);
  return `${adj}${animal}_${num}`;
}

export type RawPostWithJoins = Post & {
  comment_count: { count: number }[];
  post_votes: { vote_type: string }[];
};

export function normalizePost(p: RawPostWithJoins): Post {
  const { post_votes, comment_count, ...rest } = p;
  return {
    ...rest,
    comment_count: comment_count?.[0]?.count ?? 0,
    user_vote: (post_votes?.[0]?.vote_type as 'up' | 'down') ?? null,
  };
}
