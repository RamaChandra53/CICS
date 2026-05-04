'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Post, Profile } from '@/types';
import PostCard from '@/components/PostCard';
import EmailVerificationModal from '@/components/EmailVerificationModal';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const fetchUserPosts = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, username, is_verified, is_anonymous),
          comment_count:comments(count)
        `)
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user posts:', error);
        return;
      }

      if (data) {
        const normalized = data.map((p: Post & { comment_count: { count: number }[] }) => ({
          ...p,
          comment_count: p.comment_count?.[0]?.count ?? 0,
        }));
        setPosts(normalized);
      }
    } catch (error) {
      console.error('Unexpected error fetching user posts:', error);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      
      if (!user || !authProfile) {
        router.push('/');
        return;
      }

      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile initialization timeout')), 10000)
        );

        const initPromise = async () => {
          await fetchUserPosts(user.id);
        };

        await Promise.race([initPromise(), timeoutPromise]);
      } catch (error) {
        console.error('Profile initialization error:', error);
        if (error instanceof Error && error.message === 'Profile initialization timeout') {
          console.error('Profile page initialization timed out');
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [supabase, router, authLoading, user, authProfile, fetchUserPosts]);

  const handleVerificationSuccess = () => {
    // Profile verification status is handled by AuthContext
    // The authProfile will be updated automatically through the context
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-700"/>
            <div className="flex-1">
              <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"/>
              <div className="h-3 bg-gray-700 rounded w-1/4"/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile card */}
        <div className="bg-[#1a1a1a] border border-gray-800/60 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
              authProfile.is_anonymous ? 'bg-gray-700' : 'bg-indigo-600/30'
            }`}>
              {authProfile.is_anonymous ? '👻' : (authProfile.username?.[0]?.toUpperCase() ?? '?')}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-white font-bold text-xl">{authProfile.username}</h1>
                {authProfile.is_verified && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    ✓ verified
                  </span>
                )}
                {authProfile.is_anonymous && (
                  <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                    Anonymous
                  </span>
                )}
                {authProfile.is_email_verified && (
                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    ✉️ Email Verified
                  </span>
                )}
              </div>

              {authProfile.full_name && (
                <p className="text-gray-400 text-sm mb-1">{authProfile.full_name}</p>
              )}

              {/* Email Verification Status */}
              <div className="mt-2 mb-3">
                {authProfile.is_email_verified ? (
                  <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-2">
                    <p className="text-green-400 text-xs flex items-center gap-1">
                      ✅ Your MGIT email is verified - you can post anonymously!
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-2">
                    <p className="text-yellow-400 text-xs mb-2">
                      ⚠️ Verify your MGIT email to unlock anonymous posting
                    </p>
                    <button
                      onClick={() => setShowVerificationModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Verify Email Now
                    </button>
                  </div>
                )}
              </div>

              {!authProfile.is_anonymous && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {authProfile.year && (
                    <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                      📅 {authProfile.year} Year
                    </span>
                  )}
                  {authProfile.branch && (
                    <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                      💻 {authProfile.branch}
                    </span>
                  )}
                  {authProfile.section && (
                    <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                      👥 Section {authProfile.section}
                    </span>
                  )}
                  {authProfile.roll_number && (
                    <span className="bg-gray-800 text-gray-400 text-xs px-2.5 py-1 rounded-full">
                      🪪 {authProfile.roll_number}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800/40 flex items-center justify-between">
            <span className="text-gray-500 text-sm">
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
        <h2 className="text-gray-400 text-sm font-medium mb-3">Your Posts</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a1a] border border-gray-800/60 rounded-2xl">
            <div className="text-3xl mb-2">✏️</div>
            <p className="text-gray-500 text-sm">You haven&apos;t posted anything yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <PostCard key={post.id} post={post} showRoom />
            ))}
          </div>
        )}

        {/* Email Verification Modal */}
        <EmailVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSuccess={handleVerificationSuccess}
        />
      </div>
    </ErrorBoundary>
  );
}
