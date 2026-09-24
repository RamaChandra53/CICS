'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import PostCard from '@/components/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { getPostIdentityDisplay } from '@/lib/identityDisplay';
import { createClient } from '@/lib/supabase';
import type { Comment, Post } from '@/types';

type PublicProfile = {
  id: string; pseudo_username: string | null; year: string | null; branch: string | null;
  section: string | null; real_display_name: string | null; full_name: string | null;
  bio: string | null; default_identity: 'pseudo' | 'full'; created_at: string;
};
type PublicComment = Comment & { posts?: { headline: string | null; content: string; room: string } | null };
type ProfileTab = 'posts' | 'comments';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function UserProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams(); const router = useRouter(); const { user } = useAuth();
  const profileKey = decodeURIComponent(params.userId as string);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]); const [comments, setComments] = useState<PublicComment[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [postCount, setPostCount] = useState(0); const [commentCount, setCommentCount] = useState(0);

  const loadProfile = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let query = supabase.from('profiles_public').select('id, pseudo_username, year, branch, section, real_display_name, full_name, bio, default_identity, created_at');
      query = UUID_PATTERN.test(profileKey) ? query.eq('id', profileKey) : query.ilike('pseudo_username', profileKey);
      let { data, error: profileError } = await query.maybeSingle();
      if (profileError && profileError.code === '42703') {
        let legacyQuery = supabase.from('profiles_public').select('id, pseudo_username, year, branch, real_display_name, full_name, created_at');
        legacyQuery = UUID_PATTERN.test(profileKey) ? legacyQuery.eq('id', profileKey) : legacyQuery.ilike('pseudo_username', profileKey);
        const legacy = await legacyQuery.maybeSingle();
        data = legacy.data ? { ...legacy.data, section: null, bio: null, default_identity: 'pseudo' } : null;
        profileError = legacy.error;
      }
      if (profileError) throw profileError;
      if (!data) { setError('Profile not found.'); return; }
      const publicProfile = data as PublicProfile;
      if (user?.id === publicProfile.id) { router.replace('/profile'); return; }
      setProfile(publicProfile);

      let [postsResult, commentsResult, postsCountResult, commentsCountResult] = await Promise.all([
        supabase.from('posts_public').select('id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, link_metadata, poll_options, poll_expires_at, is_anon_post, display_mode, author_name_snapshot, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles, comment_count').eq('author_id', publicProfile.id).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous').order('created_at', { ascending: false }).limit(20),
        supabase.from('comments_public').select('id, post_id, author_id, parent_comment_id, content, is_anon_comment, display_mode, author_name_snapshot, upvotes, downvotes, created_at, posts').eq('author_id', publicProfile.id).eq('is_anon_comment', false).neq('display_mode', 'anonymous').order('created_at', { ascending: false }).limit(30),
        supabase.from('posts_public').select('id', { count: 'exact', head: true }).eq('author_id', publicProfile.id).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous'),
        supabase.from('comments_public').select('id', { count: 'exact', head: true }).eq('author_id', publicProfile.id).eq('is_anon_comment', false).neq('display_mode', 'anonymous'),
      ]);
      if (postsResult.error || commentsResult.error) {
        [postsResult, commentsResult, postsCountResult, commentsCountResult] = await Promise.all([
          supabase.from('posts').select('id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, link_metadata, poll_options, poll_expires_at, is_anon_post, display_mode, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles (id, year, branch, pseudo_username, real_display_name), comment_count:comments(count)').eq('author_id', publicProfile.id).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous').order('created_at', { ascending: false }).limit(20),
          supabase.from('comments').select('id, post_id, author_id, parent_comment_id, content, is_anon_comment, display_mode, upvotes, downvotes, created_at, posts(headline, content, room)').eq('author_id', publicProfile.id).eq('is_anon_comment', false).neq('display_mode', 'anonymous').order('created_at', { ascending: false }).limit(30),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', publicProfile.id).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous'),
          supabase.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', publicProfile.id).eq('is_anon_comment', false).neq('display_mode', 'anonymous'),
        ]);
      }
      if (postsResult.error) throw postsResult.error;
      if (commentsResult.error) throw commentsResult.error;
      const normalized = ((postsResult.data as unknown as Array<Post & { comment_count?: number | { count: number }[] }>) ?? []).map((post) => ({ ...post, comment_count: Array.isArray(post.comment_count) ? post.comment_count[0]?.count ?? 0 : post.comment_count ?? 0 }));
      setPosts(normalized); setComments((commentsResult.data as unknown as PublicComment[]) ?? []);
      setPostCount(postsCountResult.count ?? 0); setCommentCount(commentsCountResult.count ?? 0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't load this profile."); }
    finally { setLoading(false); }
  }, [profileKey, router, supabase, user?.id]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);
  if (loading) return <div className="mx-auto max-w-2xl px-4 py-8"><PostLoadingSkeleton count={3} /></div>;
  if (error || !profile) return <div className="mx-auto max-w-2xl px-4 py-16"><ErrorMessage title="Profile not found" message={error || 'This profile is unavailable.'} onRetry={loadProfile} /></div>;

  const identity = getPostIdentityDisplay(profile, profile.default_identity);
  const academic = [profile.branch, profile.year ? `${profile.year} Year` : null].filter(Boolean).join(' · ');

  return <ErrorBoundary><div className="mx-auto min-h-screen max-w-2xl bg-bg-primary text-text-primary">
    <button onClick={() => router.back()} className="mx-4 mt-4 inline-flex min-h-10 items-center gap-2 text-sm text-text-secondary hover:text-text-primary" aria-label="Go back"><span aria-hidden="true">←</span> Back</button>
    <header className="border-b border-border-primary bg-bg-secondary px-4 py-5 md:mt-2 md:rounded-t-md md:border">
      <div className="flex items-start gap-4"><div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ${identity.avatarBg}`}>{identity.avatar}</div><div className="min-w-0 flex-1"><h1 className="break-words text-xl font-bold">{identity.displayName}</h1>{academic && <p className="mt-1 text-sm text-text-secondary">{academic}</p>}{profile.bio && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{profile.bio}</p>}<p className="mt-3 text-xs text-text-muted">{postCount} Posts · {commentCount} Comments</p></div></div>
    </header>
    <div role="tablist" aria-label="Profile activity" className="grid grid-cols-2 border-b border-border-primary bg-bg-secondary">{(['posts', 'comments'] as ProfileTab[]).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`relative min-h-14 text-sm font-semibold ${activeTab === tab ? 'text-text-primary' : 'text-text-muted'}`}>{tab === 'posts' ? 'Posts' : 'Comments'}{activeTab === tab && <span className="absolute inset-x-8 bottom-0 h-0.5 bg-accent-primary" />}</button>)}</div>
    <main className="px-3 py-4 sm:px-4">{activeTab === 'posts' ? (!posts.length ? <EmptyState title="No posts yet" description="Public posts will appear here." /> : <div className="space-y-3">{posts.map((post) => <PostCard key={post.id} post={post} showRoom currentUserId={user?.id ?? null} initialUserVote={post.user_vote ?? null} />)}</div>) : (!comments.length ? <EmptyState title="No comments yet" description="Public comments will appear here." /> : <div className="space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-md border border-border-primary bg-bg-card p-4"><Link href={`/post/${comment.post_id}`} className="block truncate text-xs font-semibold text-text-secondary hover:text-text-accent">{comment.posts?.room ?? 'Campus'} · {comment.posts?.headline || comment.posts?.content?.split('\n')[0] || 'View post'}</Link><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.content}</p></article>)}</div>)}</main>
  </div></ErrorBoundary>;
}
