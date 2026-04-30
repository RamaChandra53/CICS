'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Comment, Profile, ROOMS } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import VoteButtons from '@/components/VoteButtons';

function CommentItem({
  comment,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  onReply: (commentId: string, content: string, isAnon: boolean) => Promise<void>;
  depth?: number;
}) {
  const author = comment.profiles;
  const displayName = comment.is_anon_comment ? 'Anonymous' : (author?.username ?? 'Anonymous');
  const isVerified = !comment.is_anon_comment && author?.is_verified;
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyContent.trim(), replyAnon);
    setReplyContent('');
    setReplyOpen(false);
    setSubmitting(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-gray-800/60 pl-4' : ''}`}>
      <div className="flex gap-2.5 mb-1">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
          comment.is_anon_comment ? 'bg-gray-700 text-gray-400' : 'bg-indigo-600/30 text-indigo-400'
        }`}>
          {comment.is_anon_comment ? '👻' : (displayName[0]?.toUpperCase() ?? '?')}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-white text-sm font-medium">{displayName}</span>
            {isVerified && (
              <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                ✓
              </span>
            )}
            <span className="text-gray-600 text-xs">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>

          {depth < 1 && (
            <button
              onClick={() => setReplyOpen(!replyOpen)}
              className="text-gray-500 hover:text-gray-300 text-xs mt-1.5 transition-colors"
            >
              {replyOpen ? 'Cancel' : 'Reply'}
            </button>
          )}

          {replyOpen && (
            <div className="mt-2">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                autoFocus
                className="w-full bg-[#111] border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setReplyAnon(!replyAnon)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    replyAnon ? 'bg-gray-600 text-gray-200' : 'text-gray-500 hover:bg-gray-800'
                  }`}
                >
                  👻 {replyAnon ? 'Anonymous' : 'Anon?'}
                </button>
                <button
                  onClick={handleReply}
                  disabled={submitting || !replyContent.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles (id, username, is_verified, is_anonymous)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data) {
      // Build nested structure
      const topLevel = data.filter((c: Comment) => !c.parent_comment_id);
      const nested = topLevel.map((c: Comment) => ({
        ...c,
        replies: data.filter((r: Comment) => r.parent_comment_id === c.id),
      }));
      setComments(nested);
    }
  }, [supabase, postId]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const [{ data: prof }, { data: postData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('posts')
          .select('*, profiles (id, username, is_verified, is_anonymous), post_votes!left(vote_type)')
          .eq('id', postId)
          .eq('post_votes.user_id', user.id)
          .single(),
      ]);

      setProfile(prof as Profile);
      const rawPost = postData as Post & { post_votes: { vote_type: string }[] };
      setPost({
        ...rawPost,
        user_vote: (rawPost?.post_votes?.[0]?.vote_type as 'up' | 'down') ?? null,
        post_votes: undefined,
      } as Post);
      await fetchComments();
      setLoading(false);
    };

    init();

    // Real-time for comments
    const channel = supabase
      .channel(`post-${postId}-comments`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, postId, fetchComments]);

  const handleAddComment = async (parentId?: string, content?: string, isAnonArg?: boolean) => {
    if (!profile) return;
    const commentContent = content ?? newComment.trim();
    const commentAnon = isAnonArg ?? isAnon;
    if (!commentContent) return;

    setSubmitting(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: profile.id,
        parent_comment_id: parentId || null,
        content: commentContent,
        is_anon_comment: commentAnon,
      });

      if (insertError) throw insertError;
      if (!parentId) {
        setNewComment('');
        setIsAnon(false);
      }
      await fetchComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"/>
          <div className="h-3 bg-gray-700 rounded w-full mb-2"/>
          <div className="h-3 bg-gray-700 rounded w-3/4"/>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-400">Post not found</p>
        <Link href="/feed" className="text-indigo-400 text-sm mt-2 block hover:underline">← Back to Feed</Link>
      </div>
    );
  }

  const author = post.profiles;
  const displayName = post.is_anon_post ? 'Anonymous' : (author?.username ?? 'Anonymous');
  const isVerified = !post.is_anon_post && author?.is_verified;
  const room = ROOMS.find(r => r.id === post.room);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-5 text-sm transition-colors"
      >
        ← Back
      </button>

      {/* Post */}
      <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
              post.is_anon_post ? 'bg-gray-700 text-gray-400' : 'bg-indigo-600/30 text-indigo-400'
            }`}>
              {post.is_anon_post ? '👻' : (displayName[0]?.toUpperCase() ?? '?')}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-medium">{displayName}</span>
                {isVerified && (
                  <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                    ✓ verified
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs">{formatTimeAgo(post.created_at)}</p>
            </div>
          </div>
          {room && (
            <span className="text-[11px] bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
              {room.icon} {room.label}
            </span>
          )}
        </div>

        <p className="text-gray-100 leading-relaxed text-[15px]">{post.content}</p>

        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt="Post image"
            className="mt-4 rounded-xl w-full object-cover max-h-96"
          />
        )}

        {/* Votes */}
        <div className="mt-4 pt-4 border-t border-gray-800/40">
          <VoteButtons
            postId={post.id}
            initialUpvotes={post.upvotes ?? 0}
            initialDownvotes={post.downvotes ?? 0}
            initialUserVote={post.user_vote}
          />
        </div>
      </div>

      {/* Comment count */}
      <h2 className="text-white font-semibold mb-4">
        💬 {comments.length} Comment{comments.length !== 1 ? 's' : ''}
      </h2>

      {/* New comment form */}
      {profile && (
        <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-4 mb-5">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none focus:outline-none"
          />
          {error && (
            <p className="text-red-400 text-xs mb-2 bg-red-900/20 border border-red-800/40 rounded-lg p-2">{error}</p>
          )}
          <div className="flex items-center justify-between border-t border-gray-800/40 pt-3">
            <button
              type="button"
              onClick={() => setIsAnon(!isAnon)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                isAnon ? 'bg-gray-600 text-gray-200' : 'text-gray-500 hover:bg-gray-800'
              }`}
            >
              👻 {isAnon ? 'Anonymous' : 'Post as anon?'}
            </button>
            <button
              onClick={() => handleAddComment()}
              disabled={submitting || !newComment.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleAddComment}
            />
          ))
        )}
      </div>
    </div>
  );
}
