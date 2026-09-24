'use client';

import { useRouter } from 'next/navigation';
import EnhancedCreatePostForm from '@/components/EnhancedCreatePostForm';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { useAuth } from '@/contexts/AuthContext';

export default function CreatePostPage() {
  const router = useRouter();
  const { profile, profileLoading, reloadAuth } = useAuth();

  if (profileLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-text-muted">Loading post editor...</div>;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ErrorMessage message="Your profile could not be loaded." onRetry={() => reloadAuth()} />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-3 py-4 md:px-6 md:py-8">
      <EnhancedCreatePostForm
        profile={profile}
        defaultCommunity="campus"
        initialExpanded
        presentation="page"
        onPostCreated={() => router.push('/feed')}
      />
    </div>
  );
}
