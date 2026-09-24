import type { Post } from '@/types';
import { normalizePostRows, type PostWithAuthor, type VoteType } from '@/types/domain';
import type { SupabaseClientLike } from './supabase-types';

export type FeedCommunity = 'all' | 'campus' | 'confessions' | 'placements' | 'alumni' | string;

export type FetchFeedPostsOptions = {
  community: FeedCommunity;
  page: number;
  pageSize: number;
  userId?: string | null;
  signal?: AbortSignal;
};

export type CreatePostInput = Omit<
  Post,
  'id' | 'created_at' | 'updated_at' | 'profiles' | 'comment_count' | 'user_vote' | 'link_metadata'
>;

export const POST_WITH_AUTHOR_SELECT =
  'id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, poll_options, poll_expires_at, is_anon_post, display_mode, author_name_snapshot, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles, comment_count';

const LEGACY_POST_WITH_AUTHOR_SELECT =
  'id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, poll_options, poll_expires_at, is_anon_post, display_mode, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles (id, year, branch, pseudo_username, real_display_name), comment_count:comments(count)';

const COMMUNITY_ROOM_MAP: Record<string, string[] | null> = {
  all: null,
  campus: ['campus'],
  confessions: ['confessions'],
  placements: ['placements'],
  alumni: ['alumni'],
};

export function getRoomFilters(community: string): string[] | null {
  if (community in COMMUNITY_ROOM_MAP) {
    return COMMUNITY_ROOM_MAP[community];
  }

  return [community];
}

export function mergePosts(existing: PostWithAuthor[], incoming: PostWithAuthor[]): PostWithAuthor[] {
  const seen = new Set(existing.map((post) => post.id));
  const merged = [...existing];

  for (const post of incoming) {
    if (!seen.has(post.id)) {
      merged.push(post);
      seen.add(post.id);
    }
  }

  return merged;
}

function applyAbortSignal<T>(query: T, signal?: AbortSignal): T {
  if (!signal) return query;
  const abortable = query as { abortSignal?: (signal: AbortSignal) => unknown };
  if (typeof abortable.abortSignal === 'function') {
    abortable.abortSignal(signal);
  }
  return query;
}

export async function fetchFeedPostsPage(
  supabase: SupabaseClientLike,
  { community, page, pageSize, userId, signal }: FetchFeedPostsOptions
): Promise<PostWithAuthor[]> {
  const roomFilters = getRoomFilters(community);

  const runQuery = async (table: string, select: string) => {
    let query = supabase.from(table).select(select).eq('is_draft', false)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (roomFilters?.length) query = roomFilters.length === 1 ? query.eq('room', roomFilters[0]) : query.in('room', roomFilters);
    applyAbortSignal(query, signal);
    return query;
  };

  let { data, error } = await runQuery('posts_public', POST_WITH_AUTHOR_SELECT);
  if (error && ['42P01', 'PGRST205', '42703'].includes((error as { code?: string }).code ?? '')) {
    const legacyResult = await runQuery('posts', LEGACY_POST_WITH_AUTHOR_SELECT);
    data = legacyResult.data;
    error = legacyResult.error;
  }
  if (error) throw error;

  const posts = normalizePostRows(data as unknown as Post[]);
  const postIds = posts.map((post) => post.id);

  if (!userId || postIds.length === 0) {
    return posts;
  }

  const voteQuery = supabase
    .from('post_votes')
    .select('post_id, vote_type')
    .eq('user_id', userId)
    .in('post_id', postIds);

  applyAbortSignal(voteQuery, signal);

  const { data: votes, error: voteError } = await voteQuery;
  if (voteError) {
    return posts;
  }

  const voteMap = new Map(
    ((votes as Array<{ post_id: string; vote_type: VoteType }>) ?? []).map((vote) => [
      vote.post_id,
      vote.vote_type,
    ])
  );

  return posts.map((post) => ({
    ...post,
    user_vote: voteMap.get(post.id) ?? null,
  }));
}

export async function createPost(supabase: SupabaseClientLike, post: CreatePostInput): Promise<void> {
  let { error } = await supabase.from('posts').insert(post);
  if (error && (error as { code?: string }).code === 'PGRST204' && 'author_name_snapshot' in post) {
    const { author_name_snapshot: _snapshot, ...legacyPost } = post;
    void _snapshot;
    const legacyResult = await supabase.from('posts').insert(legacyPost);
    error = legacyResult.error;
  }
  if (error) throw error;
}

export async function deletePost(supabase: SupabaseClientLike, postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}
