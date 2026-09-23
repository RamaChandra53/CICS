import type { Comment, Community, Post, Profile } from '@/types';

export type VoteType = 'up' | 'down';

export type PostVoteState = {
  user_vote: VoteType | null;
  upvotes: number;
  downvotes: number;
};

export type PostWithAuthor = Post & {
  profiles: Profile | null;
  comment_count: number;
  user_vote: VoteType | null;
};

export type CommentWithAuthor = Omit<Comment, 'profiles' | 'replies'> & {
  profiles: Profile | null;
  replies: CommentWithAuthor[];
  user_vote?: VoteType | null;
};

export type CommunitySummary = Pick<
  Community,
  'id' | 'name' | 'slug' | 'description' | 'icon' | 'type' | 'member_count' | 'created_at'
>;

export type ProfileIdentity = Pick<
  Profile,
  | 'id'
  | 'username'
  | 'full_name'
  | 'roll_number'
  | 'year'
  | 'branch'
  | 'section'
  | 'is_verified'
  | 'is_anonymous'
  | 'is_email_verified'
  | 'real_display_name'
  | 'pseudo_username'
  | 'show_roll_number_publicly'
>;

type PostRow = Post & {
  profiles?: Profile | null;
  comment_count?: number | { count: number }[] | null;
  user_vote?: VoteType | null;
};

export function normalizeCommentCount(commentCount: PostRow['comment_count']): number {
  if (Array.isArray(commentCount)) {
    return commentCount[0]?.count ?? 0;
  }

  return typeof commentCount === 'number' ? commentCount : 0;
}

export function normalizePostRow(row: PostRow): PostWithAuthor {
  return {
    ...row,
    profiles: row.profiles ?? null,
    comment_count: normalizeCommentCount(row.comment_count),
    user_vote: row.user_vote ?? null,
  };
}

export function normalizePostRows(rows: PostRow[] | null | undefined): PostWithAuthor[] {
  return (rows ?? []).map(normalizePostRow);
}

export function normalizeCommunityRows(rows: Community[] | null | undefined): CommunitySummary[] {
  return (rows ?? []).map((community) => ({
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: community.description,
    icon: community.icon,
    type: community.type,
    member_count: community.member_count,
    created_at: community.created_at,
  }));
}
