'use client';



import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Post } from '@/types';
import PostCard from '@/components/PostCard';
import TrustUnlockModal from '@/components/TrustUnlockModal';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';
import PostLoadingSkeleton from '@/components/ui/PostLoadingSkeleton';
import { validatePseudoUsername } from '@/lib/usernameGenerator';

const PAGE_SIZE = 10;

type VoteType = 'up' | 'down';

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [postsLoading, setPostsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Username edit state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSubmitting, setUsernameSubmitting] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState('');

  // Display name edit state
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [displayNameSubmitting, setDisplayNameSubmitting] = useState(false);

  const fetchUserPosts = useCallback(
    async (userId: string, pageToLoad = 0, options?: { reset?: boolean }) => {
      try {
        setPostsLoading(true);
        setPostsError('');

        const targetPage = options?.reset ? 0 : pageToLoad;
        const { data, error } = await supabase
          .from('posts')
          .select(
            'id, author_id, room, content, image_url, is_anon_post, display_mode, created_at, upvotes, downvotes, profiles (id, username, is_verified, is_anonymous, is_email_verified, year, branch, pseudo_username, real_display_name), comment_count:comments(count)'
          )
          .eq('author_id', userId)
          .order('created_at', { ascending: false })
          .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching user posts:', error);
          setPostsError(error.message || 'Failed to fetch your posts');
          return;
        }

        const postsData =
          (data as Array<Post & { comment_count: { count: number }[] }>) ?? [];
        const postIds = postsData.map((post) => post.id);
        let voteMap = new Map<string, VoteType>();

        if (userId && postIds.length > 0) {
          const { data: votes, error: votesError } = await supabase
            .from('post_votes')
            .select('post_id, vote_type')
            .eq('user_id', userId)
            .in('post_id', postIds);

          if (votesError) {
            console.error('Error fetching post votes:', votesError);
          } else {
            const votesData = (votes as Array<{ post_id: string; vote_type: VoteType }>) ?? [];
            voteMap = new Map(
              votesData.map((vote) => [vote.post_id, vote.vote_type])
            );
          }
        }

        const normalized = postsData.map((p) => ({
          ...p,
          comment_count: p.comment_count?.[0]?.count ?? 0,
          user_vote: voteMap.get(p.id) ?? null,
        }));

        if (options?.reset || targetPage === 0) {
          setPosts(normalized);
        } else {
          setPosts((prev) => [...prev, ...normalized]);
        }

        setHasMore(normalized.length === PAGE_SIZE);
      } catch (error) {
        console.error('Unexpected error fetching user posts:', error);
        setPostsError(
          error instanceof Error ? error.message : 'Something went wrong while fetching your posts'
        );
      } finally {
        setPostsLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      
      if (!user || !authProfile) {
        router.push('/');
        return;
      }

      try {
        // Add timeout to prevent infinite loading, increased to 30s for cold starts
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile initialization timeout')), 30000)
        );

        const initPromise = async () => {
          setPage(0);
          setHasMore(true);
          await fetchUserPosts(user.id, 0, { reset: true });
        };

        await Promise.race([initPromise(), timeoutPromise]);
      } catch (error) {
        console.error('Profile initialization error:', error);
        if (error instanceof Error && error.message === 'Profile initialization timeout') {
          console.error('Profile page initialization timed out');
          setPostsError('Loading timed out. The server might be waking up or network is slow. Please refresh.');
        } else {
          setPostsError('An unexpected error occurred while loading your profile.');
        }
        setPostsLoading(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [supabase, router, authLoading, user, authProfile, fetchUserPosts]);

  const loadMore = useCallback(() => {
    if (!postsLoading && hasMore && user) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserPosts(user.id, nextPage);
    }
  }, [postsLoading, hasMore, user, page, fetchUserPosts]);

  const handleVerificationSuccess = () => {
    // Refresh the profile in AuthContext to get updated verification status
    refreshProfile();
  };

  const handleEditNicknameClick = () => {
    const isVerified = authProfile?.is_email_verified || authProfile?.is_verified;
    if (!isVerified) {
      setShowTrustModal(true);
      return;
    }
    // Don't allow editing if a change is already pending
    if (authProfile?.pseudo_username_status === 'pending') return;

    // Enforce 30-day cooldown
    if (authProfile?.pseudo_username_last_changed_at) {
      const lastChanged = new Date(authProfile.pseudo_username_last_changed_at);
      const cooldownEnd = new Date(lastChanged.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() < cooldownEnd) {
        const nextDate = cooldownEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        setUsernameError(`You can request a new nickname after ${nextDate} (30-day cooldown).`);
        return;
      }
    }

    setNewUsername('');
    setUsernameError('');
    setUsernameSuccess('');
    setIsEditingUsername(true);
  };

  const handleUsernameSubmit = async () => {
    if (!authProfile) return;

    const trimmed = newUsername.trim();
    const validationError = validatePseudoUsername(trimmed);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    // Don't allow submitting the same username
    if (trimmed === authProfile.pseudo_username) {
      setUsernameError('This is already your current nickname.');
      return;
    }

    setUsernameSubmitting(true);
    setUsernameError('');

    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('pseudo_username', trimmed)
        .neq('id', authProfile.id)
        .maybeSingle();

      if (existing) {
        setUsernameError('This nickname is already taken. Try another.');
        return;
      }

      // Submit as pending change request
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pending_pseudo_username: trimmed,
          pseudo_username_status: 'pending',
          pseudo_username_requested_at: new Date().toISOString(),
          pseudo_username_rejection_reason: null,
        })
        .eq('id', authProfile.id);

      if (updateError) throw updateError;

      setIsEditingUsername(false);
      setUsernameSuccess('Nickname change request submitted for review!');
      setTimeout(() => setUsernameSuccess(''), 5000);
      refreshProfile();
    } catch (err) {
      console.error('Username change error:', err);
      setUsernameError('Failed to submit change request. Please try again.');
    } finally {
      setUsernameSubmitting(false);
    }
  };

  const handleDisplayNameSubmit = async () => {
    if (!authProfile) return;

    const trimmed = newDisplayName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setDisplayNameError('Display name must be between 2 and 50 characters.');
      return;
    }

    // Basic validation: letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmed)) {
      setDisplayNameError('Display name can only contain letters, spaces, hyphens, and apostrophes.');
      return;
    }

    setDisplayNameSubmitting(true);
    setDisplayNameError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ real_display_name: trimmed })
        .eq('id', authProfile.id);

      if (updateError) throw updateError;

      setIsEditingDisplayName(false);
      refreshProfile();
    } catch (err) {
      console.error('Display name update error:', err);
      setDisplayNameError('Failed to update display name. Please try again.');
    } finally {
      setDisplayNameSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6">
          <PostLoadingSkeleton count={1} />
        </div>
      </div>
    );
  }

  if (!authProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ErrorMessage
          title="Profile not found"
          message="Please sign in to view your profile."
          onRetry={() => router.push('/')}
          retryText="Sign In"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile card */}
        {/* Profile card — pseudo username focused */}
        <div className="bg-[#15181c] border border-[#252a31] rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-emerald-600/30">
              {authProfile.pseudo_username?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-white font-bold text-xl">{authProfile.pseudo_username || 'CampusUser'}</h1>
                {(authProfile.is_email_verified || authProfile.is_verified) && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    ✓ verified
                  </span>
                )}
                {authProfile.is_moderator && (
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                    Moderator
                  </span>
                )}
                {authProfile.pseudo_username_status !== 'pending' && (
                  <button
                    onClick={handleEditNicknameClick}
                    className="text-slate-500 hover:text-indigo-400 transition-colors ml-1"
                    aria-label="Edit nickname"
                    title={authProfile.is_email_verified || authProfile.is_verified ? 'Edit nickname' : 'Verify to edit nickname'}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>

              <p className="text-slate-400 text-xs mb-3">Campus nickname — people recognize you without knowing who you are</p>
              {authProfile.is_moderator && (
                <Link href="/admin/reports" className="inline-flex rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/10">
                  Open moderation console →
                </Link>
              )}

              {/* Username edit form */}
              {isEditingUsername && (
                <div className="mb-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
                  <label className="text-xs text-slate-400 mb-1.5 block">New nickname</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => {
                        setNewUsername(e.target.value);
                        if (usernameError) setUsernameError('');
                      }}
                      placeholder="e.g. CosmicFox"
                      maxLength={18}
                      autoFocus
                      className="flex-1 h-9 rounded-lg border border-[#252a31] bg-[#0b0f12] px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
                    />
                    <button
                      onClick={handleUsernameSubmit}
                      disabled={usernameSubmitting || !newUsername.trim()}
                      className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 shrink-0"
                    >
                      {usernameSubmitting ? 'Saving…' : 'Request'}
                    </button>
                    <button
                      onClick={() => setIsEditingUsername(false)}
                      className="h-9 rounded-lg border border-[#252a31] px-3 text-xs text-slate-400 hover:text-white transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                  {usernameError && (
                    <p className="mt-1.5 text-xs text-red-400">{usernameError}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    3–18 chars, letters & numbers only. Changes require admin approval.
                  </p>
                </div>
              )}

              {/* Username error outside edit form (e.g. cooldown message) */}
              {!isEditingUsername && usernameError && (
                <div className="mb-3 rounded-lg border border-yellow-800/40 bg-yellow-900/20 p-2">
                  <p className="text-yellow-400 text-xs">{usernameError}</p>
                </div>
              )}

              {/* Username change success message */}
              {usernameSuccess && (
                <div className="mb-3 rounded-lg border border-emerald-800/40 bg-emerald-900/20 p-2">
                  <p className="text-emerald-400 text-xs">✓ {usernameSuccess}</p>
                </div>
              )}

              {/* Real display name (for full identity mode) */}
              <div className="mb-3">
                {isEditingDisplayName ? (
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
                    <label className="text-xs text-slate-400 mb-1.5 block">Display Name (shown in &quot;Full Identity&quot; mode)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => {
                          setNewDisplayName(e.target.value);
                          if (displayNameError) setDisplayNameError('');
                        }}
                        placeholder="e.g. John Doe"
                        maxLength={50}
                        autoFocus
                        className="flex-1 h-9 rounded-lg border border-[#252a31] bg-[#0b0f12] px-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
                      />
                      <button
                        onClick={handleDisplayNameSubmit}
                        disabled={displayNameSubmitting || !newDisplayName.trim()}
                        className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 shrink-0"
                      >
                        {displayNameSubmitting ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setIsEditingDisplayName(false)}
                        className="h-9 rounded-lg border border-[#252a31] px-3 text-xs text-slate-400 hover:text-white transition-colors shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                    {displayNameError && (
                      <p className="mt-1.5 text-xs text-red-400">{displayNameError}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      This name will be shown when you post with &quot;Full Identity&quot; mode. 2–50 characters.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {authProfile.real_display_name ? (
                      <p className="text-slate-300 text-sm">{authProfile.real_display_name}</p>
                    ) : (
                      <p className="text-slate-500 text-xs italic">No display name set</p>
                    )}
                    <button
                      onClick={() => {
                        setNewDisplayName(authProfile.real_display_name || '');
                        setDisplayNameError('');
                        setIsEditingDisplayName(true);
                      }}
                      className="text-slate-500 hover:text-indigo-400 transition-colors"
                      aria-label="Edit display name"
                      title="Edit display name (for full identity mode)"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Pseudo username status */}
              {authProfile.pseudo_username_status === 'pending' && (
                <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-2 mb-3">
                  <p className="text-yellow-400 text-xs">
                    ⏳ Username change to &quot;{authProfile.pending_pseudo_username}&quot; is pending review
                  </p>
                </div>
              )}
              {authProfile.pseudo_username_status === 'rejected' && authProfile.pseudo_username_rejection_reason && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-2 mb-3">
                  <p className="text-red-400 text-xs">
                    Username change rejected: {authProfile.pseudo_username_rejection_reason}
                  </p>
                </div>
              )}

              {/* Trust status */}
              <div className="mt-2 mb-3">
                {authProfile.is_email_verified ? (
                  <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-lg p-2">
                    <p className="text-emerald-400 text-xs flex items-center gap-1">
                      ✅ MGIT email verified — identity switching, anonymous posting, partial identity, and nickname editing unlocked
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#1f2329] border border-[#252a31] rounded-lg p-2">
                    <p className="text-slate-400 text-xs mb-2">
                      🔒 Verify your MGIT email to unlock the identity switcher, anonymous posting, partial identity, and custom nickname
                    </p>
                    <button
                      onClick={() => setShowTrustModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Verify Student Account
                    </button>
                  </div>
                )}
              </div>

              {!authProfile.is_anonymous && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {authProfile.year ? (
                    <span className="bg-[#1f2329] text-slate-400 text-xs px-2.5 py-1 rounded-full">
                      📅 {authProfile.year} Year
                    </span>
                  ) : (
                    <span className="bg-purple-800/30 text-purple-400 text-xs px-2.5 py-1 rounded-full border border-purple-700/50">
                      🎓 Alumni
                    </span>
                  )}
                  {authProfile.branch && (
                    <span className="bg-[#1f2329] text-slate-400 text-xs px-2.5 py-1 rounded-full">
                      💻 {authProfile.branch}
                    </span>
                  )}
                  {authProfile.section && authProfile.year && (
                    <span className="bg-[#1f2329] text-slate-400 text-xs px-2.5 py-1 rounded-full">
                      👥 Section {authProfile.section}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Details — roll number only here */}
          {authProfile.roll_number && (
            <details className="mt-4 pt-4 border-t border-[#252a31]">
              <summary className="text-slate-500 text-xs cursor-pointer hover:text-slate-300 transition-colors">
                Account Details
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="bg-[#1f2329] text-slate-500 text-xs px-2.5 py-1 rounded-full">
                  🪪 {authProfile.roll_number}
                </span>
                {authProfile.email && (
                  <span className="bg-[#1f2329] text-slate-500 text-xs px-2.5 py-1 rounded-full">
                    📧 {authProfile.email}
                  </span>
                )}
              </div>
            </details>
          )}

          <div className="mt-4 pt-4 border-t border-[#252a31] flex items-center justify-between">
            <span className="text-slate-500 text-sm">
              {posts.length} post{posts.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleSignOut}
              className="text-red-400 hover:text-red-300 text-sm transition-colors flex items-center gap-1.5"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        {/* Posts */}
        <h2 className="text-slate-400 text-sm font-medium mb-3">Your Posts</h2>
        {postsError ? (
          <ErrorMessage
            message={postsError}
            onRetry={() => user && fetchUserPosts(user.id, 0, { reset: true })}
          />
        ) : postsLoading && posts.length === 0 ? (
          <PostLoadingSkeleton count={2} />
        ) : posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description="You haven't posted anything yet. Share your thoughts with the campus!"
            icon={<div className="text-3xl">✏️</div>}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                showRoom
                currentUserId={user?.id ?? null}
                initialUserVote={post.user_vote ?? null}
              />
            ))}

            {postsLoading && posts.length > 0 && (
              <div className="py-4 text-center text-xs text-slate-400">Loading more posts...</div>
            )}

            {hasMore && !postsLoading && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  className="rounded-lg border border-[#252a31] px-4 py-2 text-xs text-slate-300 transition-colors hover:border-indigo-400/60 hover:text-white"
                >
                  Load more posts
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trust Unlock Modal */}
        <TrustUnlockModal
          isOpen={showTrustModal}
          onClose={() => setShowTrustModal(false)}
          onVerified={handleVerificationSuccess}
          userRollNumber={authProfile.roll_number || ''}
        />
      </div>
    </ErrorBoundary>
  );
}
