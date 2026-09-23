import { test, expect } from '@playwright/test';
import { buildCommentTree } from '../../src/lib/services/comments';
import { getCommunityLabel } from '../../src/lib/services/communities';
import { mergePosts } from '../../src/lib/services/posts';
import { summarizePollVotes } from '../../src/lib/services/polls';
import { normalizePostRow } from '../../src/types/domain';
import type { Comment, Post } from '../../src/types';

const basePost: Post = {
  id: 'post-1',
  author_id: 'user-1',
  room: 'campus',
  content: 'Hello',
  post_type: 'text',
  headline: 'Hello',
  description: null,
  tags: null,
  community_slug: 'campus',
  is_draft: false,
  image_url: null,
  video_url: null,
  link_url: null,
  link_metadata: null,
  poll_options: null,
  poll_expires_at: null,
  is_anon_post: false,
  display_mode: 'pseudo',
  year_tag: null,
  branch_tag: null,
  section_tag: null,
  upvotes: 0,
  downvotes: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const comment = (id: string, parentId: string | null, createdAt: string): Comment => ({
  id,
  post_id: 'post-1',
  author_id: 'user-1',
  parent_comment_id: parentId,
  content: id,
  is_anon_comment: false,
  display_mode: 'pseudo',
  upvotes: 0,
  downvotes: 0,
  created_at: createdAt,
  profiles: null,
});

test.describe('domain service helpers', () => {
  test('normalizes Supabase comment count joins', () => {
    const normalized = normalizePostRow({
      ...basePost,
      comment_count: [{ count: 3 }],
      profiles: null,
    } as unknown as Post);

    expect(normalized.comment_count).toBe(3);
    expect(normalized.user_vote).toBeNull();
  });

  test('merges feed pages without duplicate posts', () => {
    const first = normalizePostRow(basePost);
    const duplicate = normalizePostRow({ ...basePost, upvotes: 10 });
    const second = normalizePostRow({ ...basePost, id: 'post-2' });

    expect(mergePosts([first], [duplicate, second]).map((post) => post.id)).toEqual([
      'post-1',
      'post-2',
    ]);
  });

  test('builds nested comment trees with root newest first and replies oldest first', () => {
    const tree = buildCommentTree([
      comment('reply-newer', 'root-old', '2026-01-01T00:03:00.000Z'),
      comment('root-new', null, '2026-01-01T00:04:00.000Z'),
      comment('root-old', null, '2026-01-01T00:01:00.000Z'),
      comment('reply-older', 'root-old', '2026-01-01T00:02:00.000Z'),
    ]);

    expect(tree.map((item) => item.id)).toEqual(['root-new', 'root-old']);
    expect(tree[1].replies.map((item) => item.id)).toEqual(['reply-older', 'reply-newer']);
  });

  test('summarizes poll votes by option index', () => {
    expect(
      summarizePollVotes([{ option_index: 0 }, { option_index: 1 }, { option_index: 0 }])
    ).toEqual({
      results: { 0: 2, 1: 1 },
      totalVotes: 3,
    });
  });

  test('falls back to slug when a community label is unknown', () => {
    expect(getCommunityLabel('placements')).toBe('Placements');
    expect(getCommunityLabel('new-room', [])).toBe('new-room');
  });
});
