'use client';



import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Comment, Profile, ROOMS, DisplayMode } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import HorizontalVoteButtons from '@/components/HorizontalVoteButtons';
import CommentHorizontalVotes from '@/components/CommentHorizontalVotes';
import TrustUnlockModal from '@/components/TrustUnlockModal';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPostIdentityDisplay,
  type IdentityMode,
  getIdentityModeAccess,
  getIdentityModeLabel,
  getIdentityModeHelper,
} from '@/lib/identityDisplay';

const COMMENTS_PAGE_SIZE = 50;

function CommentItem({
  comment,
  onReply,
  depth = 0,
  profile,
}: {
  comment: Comment;
  onReply: (commentId: string, content: string, displayMode: IdentityMode) => Promise<void>;
  depth?: number;
  profile: Profile | null;
}) {
  const author = comment.profiles;
  const displayMode = comment.display_mode || (comment.is_anon_comment ? 'anonymous' : 'full');

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyMode, setReplyMode] = useState<IdentityMode>('pseudo');
  const [submitting, setSubmitting] = useState(false);

  const displayInfo = getPostIdentityDisplay(
    author,
    comment.display_mode as IdentityMode,
    comment.is_anon_comment
  );

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    await onReply(comment.id, replyContent.trim(), replyMode);
    setReplyContent('');
    setReplyOpen(false);
    setSubmitting(false);
  };

  return (
    <div className={depth > 0 ? `${depth <= 3 ? 'ml-3 md:ml-4' : 'ml-0'} border-l border-[#252a31] pl-3 md:pl-4` : ''}>
      <div className="mb-2 flex gap-2.5">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${displayInfo.avatarBg}`}
        >
          {displayInfo.avatar}
        </div>

        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-white">{displayInfo.displayName}</span>

            {displayInfo.showVerified && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                ✓
              </span>
            )}

            <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
          </div>

          <p className="text-sm leading-relaxed text-slate-200">{comment.content}</p>

          {/* Horizontal vote bar */}
          <div className="mt-2">
            <CommentHorizontalVotes
              commentId={comment.id}
              initialUpvotes={comment.upvotes ?? 0}
              initialDownvotes={comment.downvotes ?? 0}
              currentUserId={profile?.id}
              onReply={() => setReplyOpen(!replyOpen)}
            />
          </div>

          {replyOpen && (
            <div className="mt-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                autoFocus
                className="w-full resize-none rounded-xl border border-[#252a31] bg-[#0f1318] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 mr-1">Reply as:</span>
                {(['pseudo', 'anonymous', 'partial', 'full'] as IdentityMode[]).map((mode) => {
                  const access = getIdentityModeAccess(profile);
                  const isLocked = access[mode].requiresVerification && !access[mode].available;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => !isLocked && setReplyMode(mode)}
                      className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        replyMode === mode
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                          : isLocked
                          ? 'text-slate-600 cursor-not-allowed opacity-50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={isLocked ? 'Requires Student Verification' : ''}
                    >
                      <span className="flex items-center gap-1">
                        {isLocked && <span className="text-[10px]">🔒</span>}
                        {getIdentityModeLabel(mode, profile)}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={handleReply}
                  disabled={submitting || !replyContent.trim()}
                  className="w-full sm:w-auto rounded-lg bg-indigo-600 px-4 py-2 text-xs text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  depth={depth + 1}
                  profile={profile}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const { user, profile: authProfile, loading: authLoading } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [flatComments, setFlatComments] = useState<Comment[]>([]);
  const [commentPage, setCommentPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentDisplayMode, setCommentDisplayMode] = useState<DisplayMode>('pseudo');
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isCommentFocused, setIsCommentFocused] = useState(false);

  // Edit/Delete state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwnPost = post?.author_id === user?.id;

  const handleEditSave = async () => {
    if (!post || !editContent.trim()) return;
    setEditSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', post.id);
      if (updateError) throw updateError;
      setPost(prev => prev ? { ...prev, content: editContent.trim() } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Edit error:', err);
      setError('Failed to update post.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    setDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      if (deleteError) throw deleteError;
      router.push('/feed');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete post.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const buildCommentTree = useCallback((items: Comment[]) => {
    interface CommentNode extends Comment {
      replies: CommentNode[];
    }

    const map: Record<string, CommentNode> = {};
    const roots: CommentNode[] = [];

    items.forEach((comment) => {
      map[comment.id] = { ...comment, replies: [] };
    });

    items.forEach((comment) => {
      if (comment.parent_comment_id && map[comment.parent_comment_id]) {
        map[comment.parent_comment_id].replies.push(map[comment.id]);
      } else {
        roots.push(map[comment.id]);
      }
    });

    const sortReplies = (nodes: CommentNode[]) => {
      nodes.forEach((node) => {
        if (node.replies.length > 0) {
          node.replies.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          sortReplies(node.replies);
        }
      });
    };

    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    sortReplies(roots);
    return roots;
  }, []);

  const fetchComments = useCallback(
    async (pageToLoad = 0, options?: { reset?: boolean }) => {
      setCommentsLoading(true);
      setCommentsError('');

      const targetPage = options?.reset ? 0 : pageToLoad;
      const { data, error: commentsError } = await supabase
        .from('comments')
        .select(
          'id, post_id, author_id, parent_comment_id, content, is_anon_comment, display_mode, upvotes, downvotes, created_at, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name)'
        )
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(targetPage * COMMENTS_PAGE_SIZE, (targetPage + 1) * COMMENTS_PAGE_SIZE - 1);

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        setCommentsError(commentsError.message || 'Failed to load comments.');
        setCommentsLoading(false);
        return;
      }

      const nextComments = (data as Comment[]) ?? [];

      setHasMoreComments(nextComments.length === COMMENTS_PAGE_SIZE);
      setFlatComments((prev) => {
        const merged = options?.reset ? nextComments : [...prev, ...nextComments];
        setComments(buildCommentTree(merged));
        return merged;
      });

      setCommentsLoading(false);
    },
    [supabase, postId, buildCommentTree]
  );

  const handleCommentDisplayModeChange = (mode: IdentityMode) => {
    const access = getIdentityModeAccess(profile);
    if (access[mode].requiresVerification && !access[mode].available) {
      setShowTrustModal(true);
      return;
    }
    setCommentDisplayMode(mode);
  };

  const handleVerificationSuccess = () => {
    setProfile((prev) => (prev ? { ...prev, is_email_verified: true } : null));
    setShowTrustModal(false);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (authLoading) return;

      if (!user) {
        router.push('/');
        return;
      }

      setProfile(authProfile ?? null);
      setError('');

      try {
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(
            'id, author_id, room, content, image_url, video_url, link_url, post_type, poll_options, poll_expires_at, is_anon_post, display_mode, created_at, upvotes, downvotes, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name)'
          )
          .eq('id', postId)
          .single();

        if (postError) {
          throw postError;
        }

        if (cancelled) return;

        setPost(postData as Post);
        setCommentPage(0);
        setHasMoreComments(true);
        setFlatComments([]);
        await fetchComments(0, { reset: true });
      } catch (initError) {
        console.error('Error loading post:', initError);
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : 'Failed to load post.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    const channel = supabase
      .channel(`post-${postId}-comments`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          setCommentPage(0);
          setHasMoreComments(true);
          setFlatComments([]);
          fetchComments(0, { reset: true });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, router, postId, fetchComments, authLoading, user, authProfile]);

  const handleAddComment = async (
    parentId?: string,
    content?: string,
    replyDisplayMode?: IdentityMode
  ) => {
    if (!profile) return;

    const commentContent = content ?? newComment.trim();
    if (!commentContent) return;

    const displayMode = replyDisplayMode || commentDisplayMode;

    setSubmitting(true);
    setError('');

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticComment: Comment = {
      id: optimisticId,
      post_id: postId,
      author_id: profile.id,
      parent_comment_id: parentId || null,
      content: commentContent,
      is_anon_comment: displayMode === 'anonymous',
      display_mode: displayMode,
      created_at: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      profiles: displayMode === 'anonymous' ? null : profile,
    };

    setFlatComments((prev) => {
      const updated = [optimisticComment, ...prev];
      setComments(buildCommentTree(updated));
      return updated;
    });

    try {
      const { data: insertedComment, error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          parent_comment_id: parentId || null,
          content: commentContent,
          is_anon_comment: displayMode === 'anonymous',
          display_mode: displayMode,
        })
        .select('id, created_at')
        .single();

      if (insertError) throw insertError;

      if (!parentId) {
        setNewComment('');
        setCommentDisplayMode('pseudo');
        setIsCommentFocused(false);
      }

      if (insertedComment) {
        setFlatComments((prev) => {
          const updated = prev.map((comment) =>
            comment.id === optimisticId
              ? { ...comment, id: insertedComment.id, created_at: insertedComment.created_at }
              : comment
          );
          setComments(buildCommentTree(updated));
          return updated;
        });
      }
    } catch (err: unknown) {
      setFlatComments((prev) => {
        const updated = prev.filter((comment) => comment.id !== optimisticId);
        setComments(buildCommentTree(updated));
        return updated;
      });
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMoreComments = useCallback(() => {
    if (!commentsLoading && hasMoreComments) {
      const nextPage = commentPage + 1;
      setCommentPage(nextPage);
      fetchComments(nextPage);
    }
  }, [commentPage, commentsLoading, hasMoreComments, fetchComments]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse rounded-2xl border border-gray-800/60 bg-[#1a1a1a] p-4">
          <div className="mb-3 h-4 w-1/3 rounded bg-gray-700" />
          <div className="mb-2 h-3 w-full rounded bg-gray-700" />
          <div className="h-3 w-3/4 rounded bg-gray-700" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mb-3 text-4xl">🔍</div>
        <p className="text-gray-400">Post not found</p>
        <Link href="/feed" className="mt-2 block text-sm text-indigo-400 hover:underline">
          ← Back to Feed
        </Link>
      </div>
    );
  }

  const author = post.profiles;
  const postDisplayMode = post.display_mode || (post.is_anon_post ? 'anonymous' : 'full');

  const postDisplayInfo = getPostIdentityDisplay(author, postDisplayMode, post.is_anon_post);

  const room = ROOMS.find((r) => r.id === post.room);
  const postContent = post.content ?? '';
  const [postHeadline, ...postBodyLines] = postContent.split('\n');
  const postBody = postBodyLines.join('\n').trim();

  const isExpanded = isCommentFocused || newComment.trim().length > 0;

  return (
    <div className="mx-auto w-full px-3 pb-24 pt-4 md:max-w-2xl md:px-6 md:pt-6">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Back
      </button>

      <div className="mb-5 rounded-2xl border border-[#252a31] bg-[#15181c] p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <Link
              href={`/room/${room?.id || 'campus'}`}
              className="font-semibold text-slate-200 hover:text-indigo-300 transition-colors"
            >
              campus/{room?.label || 'general'}
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">{postDisplayInfo.displayName}</span>
            {postDisplayInfo.showVerified && postDisplayMode !== 'anonymous' && (
              <span className="text-[10px] font-semibold text-indigo-300">✓</span>
            )}
            <span className="text-slate-600">•</span>
            <span>{formatTimeAgo(post.created_at)}</span>
          </div>

          {/* Edit/Delete actions for own posts */}
          {isOwnPost && !isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditContent(post.content);
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                title="Edit post"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                title="Delete post"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 rounded-xl border border-red-800/40 bg-red-900/20 p-3">
            <p className="text-sm text-red-300 mb-2">Are you sure you want to delete this post? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-[#252a31] px-4 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Editing mode */}
        {isEditing ? (
          <div className="mt-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none rounded-xl border border-[#252a31] bg-[#0f1318] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none min-h-[120px]"
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editContent.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {editSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-[#252a31] px-4 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-3 text-base font-semibold text-slate-100 leading-snug">
              {postHeadline}
            </h1>

            {postBody && (
              <p className="mt-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                {postBody}
              </p>
            )}

            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post image"
                className="mt-4 max-h-96 w-full rounded-2xl border border-[#252a31] object-cover"
              />
            )}

            {post.video_url && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#252a31]">
                <video
                  src={post.video_url}
                  controls
                  preload="metadata"
                  className="w-full max-h-[500px]"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {post.link_url && !post.image_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block overflow-hidden rounded-2xl border border-[#252a31] hover:border-[#353a41] transition-colors p-3"
              >
                <p className="text-xs text-indigo-400 mb-1 truncate">
                  {(() => { try { return new URL(post.link_url).hostname; } catch { return post.link_url; } })()}
                </p>
                <p className="text-sm text-slate-300 truncate">{post.link_url}</p>
              </a>
            )}

            <div className="mt-4 border-t border-[#252a31] pt-4">
              <HorizontalVoteButtons
                postId={post.id}
                initialUpvotes={post.upvotes ?? 0}
                initialDownvotes={post.downvotes ?? 0}
                commentCount={flatComments.length}
                showActions={true}
                postContent={postContent}
                currentUserId={user?.id ?? null}
              />
            </div>
          </>
        )}
      </div>


      <h2 className="mb-4 text-sm font-semibold text-slate-200">
        {flatComments.length} Comment{flatComments.length !== 1 ? 's' : ''}
      </h2>

      {profile && (
        <div 
          className="mb-5 rounded-2xl border border-[#252a31] bg-[#15181c] p-4 transition-all duration-200"
          onBlur={(e) => {
            // Only collapse if clicking outside this component AND the input is empty
            if (!e.currentTarget.contains(e.relatedTarget) && !newComment.trim()) {
              setIsCommentFocused(false);
            }
          }}
        >
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => setIsCommentFocused(true)}
            placeholder="Join the conversation..."
            rows={isExpanded ? 3 : 1}
            className={`w-full resize-none rounded-xl border border-[#252a31] bg-[#0f1318] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none transition-all duration-200 ${
              isExpanded ? 'min-h-[96px]' : 'min-h-[40px] overflow-hidden'
            }`}
          />

          {error && (
            <p className="mt-2 rounded-lg border border-red-800/40 bg-red-900/20 p-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {isExpanded && (
            <div className="mt-3 flex flex-col gap-3 border-t border-[#252a31] pt-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-slate-400">Post as:</span>

                {(['pseudo', 'anonymous', 'partial', 'full'] as IdentityMode[]).map((mode) => {
                  const access = getIdentityModeAccess(profile);
                  const isLocked = access[mode].requiresVerification && !access[mode].available;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleCommentDisplayModeChange(mode)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                        commentDisplayMode === mode
                          ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-200'
                          : isLocked
                          ? 'border-[#252a31] text-slate-500'
                          : 'border-[#252a31] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {isLocked && <span className="text-[10px]">🔒</span>}
                        {getIdentityModeLabel(mode, profile)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCommentFocused(false)}
                  className="h-11 flex-1 rounded-xl border border-[#252a31] text-sm font-medium text-slate-300 transition-colors hover:bg-[#1f2329] md:flex-none md:px-6"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddComment()}
                  disabled={submitting || !newComment.trim()}
                  className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 md:flex-none md:px-6"
                >
                  {submitting ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {commentsError && (
        <div className="mb-4 rounded-lg border border-red-800/40 bg-red-900/20 p-3 text-xs text-red-400">
          {commentsError}
        </div>
      )}

      <div className="space-y-4">
        {commentsLoading && flatComments.length === 0 ? (
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-300" />
            <p className="mt-2 text-sm text-gray-400">Loading comments...</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleAddComment}
              profile={profile}
            />
          ))
        )}

        {commentsLoading && flatComments.length > 0 && (
          <div className="py-4 text-center text-sm text-gray-400">Loading more comments...</div>
        )}

        {hasMoreComments && !commentsLoading && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMoreComments}
              className="h-10 rounded-full border border-[#252a31] px-5 text-xs text-slate-200 transition-colors hover:border-indigo-400/60 hover:text-indigo-200"
            >
              Load more comments
            </button>
          </div>
        )}

        {flatComments.length === 0 && !commentsLoading && !commentsError && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
          </div>
        )}
      </div>

      <TrustUnlockModal
        isOpen={showTrustModal}
        onClose={() => setShowTrustModal(false)}
        onVerified={handleVerificationSuccess}
        userRollNumber={profile?.roll_number || ''}
      />
    </div>
  );
}
