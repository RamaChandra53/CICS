'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import PostCard from '@/components/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getDefaultPublishingIdentity, getPostIdentityDisplay } from '@/lib/identityDisplay';
import { createClient } from '@/lib/supabase';
import type { Comment, Post, PublishingIdentity } from '@/types';

const PAGE_SIZE = 10;
type ProfileTab = 'posts' | 'comments';
type ProfileComment = Comment & { posts?: { headline: string | null; content: string; room: string } | null };

function MenuIcon() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, profile, loading: authLoading, profileLoading, signOut, reloadAuth, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<ProfileComment[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [commentsError, setCommentsError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [defaultIdentity, setDefaultIdentity] = useState<'pseudo' | 'full'>('pseudo');

  const fetchPosts = useCallback(async (userId: string, pageToLoad = 0, reset = false) => {
    setPostsLoading(true); setPostsError('');
    try {
      const targetPage = reset ? 0 : pageToLoad;
      let { data, error } = await supabase.from('posts_public')
        .select('id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, link_metadata, poll_options, poll_expires_at, is_anon_post, display_mode, author_name_snapshot, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles, comment_count')
        .eq('author_id', userId).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous')
        .order('created_at', { ascending: false }).range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);
      if (error && ['42P01', 'PGRST205', '42703'].includes((error as { code?: string }).code ?? '')) {
        const legacy = await supabase.from('posts')
          .select('id, author_id, room, content, post_type, headline, description, tags, community_slug, is_draft, image_url, video_url, link_url, link_metadata, poll_options, poll_expires_at, is_anon_post, display_mode, year_tag, branch_tag, section_tag, created_at, updated_at, upvotes, downvotes, profiles (id, year, branch, pseudo_username, real_display_name), comment_count:comments(count)')
          .eq('author_id', userId).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous')
          .order('created_at', { ascending: false }).range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);
        data = legacy.data; error = legacy.error;
      }
      if (error) throw error;
      const normalized = ((data as unknown as Array<Post & { comment_count?: number | { count: number }[] }>) ?? []).map((post) => ({ ...post, comment_count: Array.isArray(post.comment_count) ? post.comment_count[0]?.count ?? 0 : post.comment_count ?? 0 }));
      setPosts((current) => reset || targetPage === 0 ? normalized : [...current, ...normalized]);
      setHasMore(normalized.length === PAGE_SIZE);
    } catch (error) { setPostsError(error instanceof Error ? error.message : 'Failed to load your posts'); }
    finally { setPostsLoading(false); }
  }, [supabase]);

  const fetchComments = useCallback(async (userId: string) => {
    setCommentsLoading(true); setCommentsError('');
    try {
      let { data, error } = await supabase.from('comments_public')
        .select('id, post_id, author_id, parent_comment_id, content, is_anon_comment, display_mode, author_name_snapshot, upvotes, downvotes, created_at, posts')
        .eq('author_id', userId).eq('is_anon_comment', false).neq('display_mode', 'anonymous')
        .order('created_at', { ascending: false }).limit(30);
      if (error && ['42P01', 'PGRST205', '42703'].includes((error as { code?: string }).code ?? '')) {
        const legacy = await supabase.from('comments')
          .select('id, post_id, author_id, parent_comment_id, content, is_anon_comment, display_mode, upvotes, downvotes, created_at, posts(headline, content, room)')
          .eq('author_id', userId).eq('is_anon_comment', false).neq('display_mode', 'anonymous')
          .order('created_at', { ascending: false }).limit(30);
        data = legacy.data; error = legacy.error;
      }
      if (error) throw error;
      setComments((data as unknown as ProfileComment[]) ?? []);
    } catch (error) { setCommentsError(error instanceof Error ? error.message : 'Failed to load your comments'); }
    finally { setCommentsLoading(false); }
  }, [supabase]);

  const fetchCounts = useCallback(async (userId: string) => {
    let [postResult, commentResult] = await Promise.all([
      supabase.from('posts_public').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous'),
      supabase.from('comments_public').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_anon_comment', false).neq('display_mode', 'anonymous'),
    ]);
    if (postResult.error || commentResult.error) {
      [postResult, commentResult] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_draft', false).eq('is_anon_post', false).neq('display_mode', 'anonymous'),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_anon_comment', false).neq('display_mode', 'anonymous'),
      ]);
    }
    setPostCount(postResult.count ?? 0); setCommentCount(commentResult.count ?? 0);
  }, [supabase]);

  useEffect(() => {
    if (authLoading || profileLoading || !user || !profile) return;
    setDisplayName(profile.real_display_name ?? ''); setBio(profile.bio ?? '');
    setDefaultIdentity(getDefaultPublishingIdentity(profile) === 'full' ? 'full' : 'pseudo');
    setPage(0); setHasMore(true);
    void Promise.all([fetchPosts(user.id, 0, true), fetchComments(user.id), fetchCounts(user.id)]);
  }, [authLoading, fetchComments, fetchCounts, fetchPosts, profile, profileLoading, user]);

  const saveProfile = async () => {
    if (!user || bio.length > 160) return;
    setSaving(true); setEditError('');
    let compatibilityWarning = '';
    let { error } = await supabase.from('profiles').update({ real_display_name: displayName.trim() || null, bio: bio.trim() || null, default_identity: defaultIdentity }).eq('id', user.id);
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      const legacy = await supabase.from('profiles').update({ real_display_name: displayName.trim() || null }).eq('id', user.id);
      error = legacy.error;
      if (!error && (bio.trim() || defaultIdentity !== 'pseudo')) compatibilityWarning = 'Display name saved. Apply migration 013 to enable bio and default identity.';
    }
    if (error) setEditError(error.message);
    else if (compatibilityWarning) setEditError(compatibilityWarning);
    else { await refreshProfile(); setEditing(false); }
    setSaving(false);
  };

  const loadMore = () => {
    if (!user || postsLoading || !hasMore) return;
    const next = page + 1; setPage(next); void fetchPosts(user.id, next);
  };

  if (authLoading || profileLoading) return <div className="mx-auto max-w-2xl px-4 py-8"><PostLoadingSkeleton count={2} /></div>;
  if (!profile) return <div className="mx-auto max-w-2xl px-4 py-12"><ErrorMessage message="Your profile could not be loaded." onRetry={() => reloadAuth()} /></div>;

  const publicMode: PublishingIdentity = getDefaultPublishingIdentity(profile);
  const identity = getPostIdentityDisplay(profile, publicMode);
  const academic = [profile.branch, profile.year ? `${profile.year} Year` : null].filter(Boolean).join(' · ');

  return (
    <ErrorBoundary>
      <div className="mx-auto min-h-screen max-w-2xl bg-bg-primary text-text-primary">
        <header className="border-b border-border-primary bg-bg-secondary px-4 py-5 md:mt-6 md:rounded-t-md md:border">
          <div className="flex items-start gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ${identity.avatarBg}`}>{identity.avatar}</div>
            <div className="min-w-0 flex-1"><h1 className="break-words text-xl font-bold leading-tight">{identity.displayName}</h1>{academic && <p className="mt-1 text-sm text-text-secondary">{academic}</p>}{profile.bio ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{profile.bio}</p> : <button type="button" onClick={() => setEditing(true)} className="mt-2 text-sm text-text-accent">Add a bio</button>}<p className="mt-3 text-xs text-text-muted">{postCount} Posts · {commentCount} Comments</p></div>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open profile menu" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary hover:text-text-primary"><MenuIcon /></button>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="mt-4 min-h-10 rounded-md border border-border-primary bg-bg-card px-4 text-sm font-semibold">Edit profile</button>
        </header>

        <div role="tablist" aria-label="Profile activity" className="grid grid-cols-2 border-b border-border-primary bg-bg-secondary">{(['posts', 'comments'] as ProfileTab[]).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`relative min-h-14 text-sm font-semibold ${activeTab === tab ? 'text-text-primary' : 'text-text-muted'}`}>{tab === 'posts' ? 'Posts' : 'Comments'}{activeTab === tab && <span className="absolute inset-x-8 bottom-0 h-0.5 bg-accent-primary" />}</button>)}</div>

        <main className="px-3 py-4 sm:px-4">
          {activeTab === 'posts' && (postsError ? <ErrorMessage message={postsError} onRetry={() => user && fetchPosts(user.id, 0, true)} /> : postsLoading && !posts.length ? <PostLoadingSkeleton count={2} /> : !posts.length ? <EmptyState title="No posts yet" description="Your public posts will appear here." /> : <div className="space-y-3">{posts.map((post) => <PostCard key={post.id} post={post} showRoom currentUserId={user?.id ?? null} initialUserVote={post.user_vote ?? null} />)}{hasMore && !postsLoading && <button onClick={loadMore} className="mx-auto block min-h-10 rounded-md border border-border-primary px-5 text-sm font-semibold">Load more</button>}</div>)}
          {activeTab === 'comments' && (commentsError ? <ErrorMessage message={commentsError} onRetry={() => user && fetchComments(user.id)} /> : commentsLoading ? <PostLoadingSkeleton count={2} /> : !comments.length ? <EmptyState title="No comments yet" description="Your public comments will appear here." /> : <div className="space-y-3">{comments.map((comment) => <article key={comment.id} className="rounded-md border border-border-primary bg-bg-card p-4"><Link href={`/post/${comment.post_id}`} className="block truncate text-xs font-semibold text-text-secondary hover:text-text-accent">{comment.posts?.room ?? 'Campus'} · {comment.posts?.headline || comment.posts?.content?.split('\n')[0] || 'View post'}</Link><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.content}</p><p className="mt-2 text-xs text-text-muted">{formatDate(comment.created_at)}</p></article>)}</div>)}
        </main>

        {editing && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center" onClick={() => setEditing(false)}><section role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="max-h-[90vh] w-full overflow-y-auto rounded-t-md border border-border-primary bg-bg-secondary p-5 sm:max-w-md sm:rounded-md" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="edit-profile-title" className="text-lg font-bold">Edit profile</h2><button type="button" onClick={() => setEditing(false)} aria-label="Close edit profile" className="h-10 w-10 text-text-muted">×</button></div><label className="mt-5 block text-sm font-semibold" htmlFor="display-name">Display name</label><input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} className="mt-2 min-h-11 w-full rounded-md border border-border-primary bg-bg-primary px-3 outline-none focus:border-accent-primary" /><label className="mt-4 block text-sm font-semibold" htmlFor="profile-bio">Bio</label><textarea id="profile-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={4} className="mt-2 w-full resize-none rounded-md border border-border-primary bg-bg-primary p-3 outline-none focus:border-accent-primary" /><p className="mt-1 text-right text-xs text-text-muted">{bio.length}/160</p><fieldset className="mt-4"><legend className="text-sm font-semibold">Default identity</legend><div className="mt-2 grid grid-cols-2 gap-2">{(['pseudo', 'full'] as const).map((mode) => <button key={mode} type="button" aria-pressed={defaultIdentity === mode} onClick={() => setDefaultIdentity(mode)} className={`min-h-11 rounded-md border text-sm font-semibold ${defaultIdentity === mode ? 'border-accent-primary bg-bg-tertiary' : 'border-border-primary'}`}>{mode === 'pseudo' ? profile.pseudo_username || 'Pseudo' : profile.real_display_name || profile.full_name || 'Full name'}</button>)}</div></fieldset>{academic && <p className="mt-4 text-xs text-text-muted">Academic details: {academic}</p>}{editError && <p className="mt-4 text-sm text-red-500">{editError}</p>}<button type="button" onClick={saveProfile} disabled={saving || bio.length > 160} className="mt-6 min-h-11 w-full rounded-md bg-accent-primary text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button></section></div>}

        {menuOpen && <div className="fixed inset-0 z-50 bg-black/55" onClick={() => setMenuOpen(false)}><aside className="ml-auto flex h-full w-[86%] max-w-sm flex-col border-l border-border-primary bg-bg-secondary" onClick={(event) => event.stopPropagation()}><div className="flex h-16 items-center justify-between border-b border-border-primary px-5"><h2 className="font-bold">Profile menu</h2><button type="button" onClick={() => setMenuOpen(false)} className="h-10 w-10 text-text-muted" aria-label="Close menu">×</button></div><div className="flex flex-1 flex-col p-5"><button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }} className="min-h-11 border-b border-border-primary text-left text-sm font-semibold">Edit profile</button><details className="border-b border-border-primary py-5" open><summary className="cursor-pointer text-sm font-semibold">App Settings</summary><div className="mt-5 flex items-center justify-between"><div><p className="text-sm font-medium">Dark mode</p><p className="text-xs text-text-muted">Saved on this device</p></div><button type="button" role="switch" aria-label="Dark mode" aria-checked={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`relative h-7 w-12 rounded-full ${theme === 'dark' ? 'bg-accent-primary' : 'bg-border-secondary'}`}><span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} /></button></div></details><button type="button" onClick={async () => { await signOut(); router.replace('/'); }} className="mt-auto min-h-11 w-full rounded-md border border-red-500 px-4 text-left text-sm font-semibold text-red-500">Logout</button></div></aside></div>}
      </div>
    </ErrorBoundary>
  );
}
