import type { Comment, DisplayMode, Profile } from '@/types';
import type { CommentWithAuthor } from '@/types/domain';
import type { SupabaseClientLike } from './supabase-types';

export const COMMENT_WITH_AUTHOR_SELECT =
  'id, post_id, author_id, parent_comment_id, content, is_anon_comment, display_mode, upvotes, downvotes, created_at, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name)';

export function buildCommentTree(items: Comment[]): CommentWithAuthor[] {
  const map: Record<string, CommentWithAuthor> = {};
  const roots: CommentWithAuthor[] = [];

  for (const comment of items) {
    map[comment.id] = {
      ...comment,
      profiles: comment.profiles ?? null,
      replies: [],
    };
  }

  for (const comment of items) {
    const node = map[comment.id];
    if (!node) continue;

    if (comment.parent_comment_id && map[comment.parent_comment_id]) {
      map[comment.parent_comment_id].replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortReplies = (nodes: CommentWithAuthor[]) => {
    for (const node of nodes) {
      if (node.replies.length > 0) {
        node.replies.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        sortReplies(node.replies);
      }
    }
  };

  roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  sortReplies(roots);

  return roots;
}

export async function fetchCommentsPage(
  supabase: SupabaseClientLike,
  postId: string,
  page: number,
  pageSize: number
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_WITH_AUTHOR_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw error;

  return (data as unknown as Comment[]) ?? [];
}

export function createOptimisticComment(input: {
  postId: string;
  author: Profile;
  content: string;
  parentId?: string;
  displayMode: DisplayMode;
}): Comment {
  return {
    id: `optimistic-${Date.now()}`,
    post_id: input.postId,
    author_id: input.author.id,
    parent_comment_id: input.parentId ?? null,
    content: input.content,
    is_anon_comment: input.displayMode === 'anonymous',
    display_mode: input.displayMode,
    created_at: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    profiles: input.displayMode === 'anonymous' ? null : input.author,
  };
}

export async function createComment(
  supabase: SupabaseClientLike,
  input: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string;
    displayMode: DisplayMode;
  }
): Promise<Pick<Comment, 'id' | 'created_at'>> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: input.postId,
      author_id: input.authorId,
      parent_comment_id: input.parentId ?? null,
      content: input.content,
      is_anon_comment: input.displayMode === 'anonymous',
      display_mode: input.displayMode,
    })
    .select('id, created_at')
    .single();

  if (error) throw error;

  return data as Pick<Comment, 'id' | 'created_at'>;
}
