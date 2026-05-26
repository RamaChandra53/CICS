'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, Community, ROOMS } from '@/types';
import CollegeEmailVerificationModal from './CollegeEmailVerificationModal';

import PostTypeSelector, { PostType as PostTypeEnum } from './PostTypeSelector';
import TextPostForm from './TextPostForm';
import ImagePostForm from './ImagePostForm';
import VideoPostForm from './VideoPostForm';
import LinkPostForm from './LinkPostForm';
import PollPostForm from './PollPostForm';


import CommunitySelector from './CommunitySelector';

const ANONYMOUS_ALLOWED_WITHOUT_EMAIL = ['confessions', 'rants', 'random'];
const ANONYMOUS_REQUIRES_EMAIL = ['placements'];

function requiresEmailForAnonymous(community: string) {
  return ANONYMOUS_REQUIRES_EMAIL.includes(community);
}

interface EnhancedCreatePostFormProps {
  profile: Profile;
  defaultCommunity?: string;
  onPostCreated?: () => void;
  className?: string;
}

interface PostFormData {
  postType: PostTypeEnum;
  headline: string;
  description: string;
  tags: string[];
  community: string;
  isAnonymous: boolean;
  isDraft: boolean;

  images: File[];
  videoUrl: string;
  videoFile: File | null;
  linkUrl: string;
  pollQuestion: string;
  pollOptions: string[];
  pollExpiresAt: string | null;
}

const EnhancedCreatePostForm: React.FC<EnhancedCreatePostFormProps> = ({
  profile,
  defaultCommunity = '',
  onPostCreated,
  className = '',
}) => {
  const supabase = createClient();

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [displayMode, setDisplayMode] = useState<'full' | 'partial' | 'anonymous'>('full');
  const [localCommunities, setLocalCommunities] = useState<Community[]>([]);

  React.useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('id, name, slug, description, icon, type, member_count, created_at')
          .order('member_count', { ascending: false });

        if (error || !data || data.length === 0) {
          // Fallback to ROOMS if database returns empty or error
          const fallbackCommunities: Community[] = ROOMS.map((room) => ({
            id: room.id,
            name: room.label,
            slug: room.id,
            description: room.description,
            icon: room.icon,
            type: 'open',
            member_count: 0,
            created_at: new Date().toISOString()
          }));
          setLocalCommunities(fallbackCommunities);
        } else {
          setLocalCommunities(data);
        }
      } catch (err) {
        console.error('Failed to fetch communities for form:', err);
      }
    };
    fetchCommunities();
  }, [supabase]);

  const [formData, setFormData] = useState<PostFormData>({
    postType: 'text',
    headline: '',
    description: '',
    tags: [],
    community: defaultCommunity,
    isAnonymous: false,
    isDraft: false,
    images: [],
    videoUrl: '',
    videoFile: null,
    linkUrl: '',
    pollQuestion: '',
    pollOptions: ['', ''],
    pollExpiresAt: null,
  });

  const updateFormData = (updates: Partial<PostFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleDisplayModeChange = (mode: 'full' | 'partial' | 'anonymous') => {
    // Full and partial modes are always allowed
    if (mode !== 'anonymous') {
      setDisplayMode(mode);
      updateFormData({ isAnonymous: false });
      return;
    }

    // Anonymous: check if community requires verification
    if (!profile.is_email_verified && requiresEmailForAnonymous(formData.community)) {
      setShowVerificationModal(true);
      return; // Don't change mode
    }

    setDisplayMode('anonymous');
    updateFormData({ isAnonymous: true });
  };

  const handleVerificationSuccess = () => {
    window.location.reload();
  };

  const getDisplayModeLabel = (mode: 'full' | 'partial' | 'anonymous') => {
    switch (mode) {
      case 'full':
        return profile.roll_number
          ? `${profile.roll_number} · ${profile.branch || 'Unknown'} · ${profile.year || 'Unknown'}`
          : profile.username || 'Unknown';

      case 'partial': {
        const isVerified = profile.is_email_verified || profile.is_verified;
        return profile.branch && profile.year
          ? `${profile.branch}_${profile.year}${isVerified ? ' ✓' : ''}`
          : isVerified ? 'Verified ✓' : (profile.branch || profile.year || 'Partial');
      }

      case 'anonymous':
        return '👻 Anonymous';

      default:
        return profile.username || 'Unknown';
    }
  };

  const validateForm = (): string | null => {
    if (!formData.headline.trim()) {
      return 'Headline is required';
    }

    if (formData.postType === 'poll') {
      if (!formData.pollQuestion.trim()) {
        return 'Poll question is required';
      }

      const validOptions = formData.pollOptions.filter((opt) => opt.trim());

      if (validOptions.length < 2) {
        return 'At least 2 poll options are required';
      }
    }

    if (formData.postType === 'link' && !formData.linkUrl.trim()) {
      return 'Link URL is required';
    }

    if (!formData.community) {
      return 'Please select a community';
    }

    return null;
  };

  const resetForm = () => {
    setFormData({
      postType: 'text',
      headline: '',
      description: '',
      tags: [],
      community: defaultCommunity,
      isAnonymous: false,
      isDraft: false,
      images: [],
      videoUrl: '',
      videoFile: null,
      linkUrl: '',
      pollQuestion: '',
      pollOptions: ['', ''],
      pollExpiresAt: null,
    });

    setDisplayMode('full');
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    saveAsDraft: boolean = false
  ) => {
    e?.preventDefault();

    const validationError = validateForm();

    if (validationError && !saveAsDraft) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (!profile.id) {
        throw new Error('User profile ID is missing');
      }

      if (!formData.community) {
        throw new Error('Community is required');
      }

      if (!formData.headline.trim() && !saveAsDraft) {
        throw new Error('Headline is required');
      }

      if (formData.postType === 'image' && formData.images.length > 0) {
        const imageUrls: string[] = [];

        for (const image of formData.images) {
          const filePath = `${profile.id}/${Date.now()}_${image.name}`;

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(filePath, image);

          if (uploadError) {
            throw uploadError;
          }

          const { data } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);

          imageUrls.push(data.publicUrl);
        }

        imageUrl = imageUrls[0] ?? null;
      }

      if (formData.postType === 'video') {
        if (formData.videoFile) {
          const filePath = `${profile.id}/${Date.now()}_${formData.videoFile.name}`;

          const { error: uploadError } = await supabase.storage
            .from('post-videos')
            .upload(filePath, formData.videoFile);

          if (uploadError) {
            throw uploadError;
          }

          const { data } = supabase.storage
            .from('post-videos')
            .getPublicUrl(filePath);

          videoUrl = data.publicUrl;
        } else if (formData.videoUrl.trim()) {
          videoUrl = formData.videoUrl.trim();
        }
      }

      const postData = {
        author_id: profile.id,
        room: formData.community,
        content:
          formData.headline.trim() +
          (formData.description.trim()
            ? `\n\n${formData.description.trim()}`
            : ''),
        image_url: imageUrl,
        video_url: videoUrl,
        is_anon_post: formData.isAnonymous || false,
        display_mode: displayMode,
        year_tag: profile.year || null,
        branch_tag: profile.branch || null,
        section_tag: profile.section || null,
        upvotes: 0,
        downvotes: 0,
      };

      // If we have files to upload, we must wait for them and the subsequent insert to complete
      const hasUploads = (formData.postType === 'image' && formData.images.length > 0) || 
                         (formData.postType === 'video' && formData.videoFile);

      if (hasUploads) {
        // Await the insert if we are already waiting for uploads
        const { error: insertError } = await supabase.from('posts').insert(postData);
        if (insertError) throw new Error(insertError.message || 'Failed to create post');
        
        resetForm();
        setExpanded(false);
        onPostCreated?.();
        setLoading(false);
      } else {
        // Optimistic UI for text/link/polls - close form instantly, let DB insert in background
        resetForm();
        setExpanded(false);
        setLoading(false);
        
        supabase.from('posts').insert(postData).then(({ error: insertError }: { error: { message: string } | null }) => {
          if (insertError) {
            console.error('Failed to create post in background:', insertError.message);
          } else {
            // Only trigger the callback after the post is safely in the database, 
            // so the parent feed fetches the fresh data.
            onPostCreated?.();
          }
        });
      }
    } catch (err: unknown) {
      console.error('Post creation error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create post. Please try again.');
      }
      if (loading) {
        setLoading(false);
      }
    }
  };

  const renderPostTypeForm = () => {
    const commonProps = {
      headline: formData.headline,
      description: formData.description,
      onHeadlineChange: (value: string) => updateFormData({ headline: value }),
      onDescriptionChange: (value: string) => updateFormData({ description: value }),
      className: 'mb-4',
    };

    switch (formData.postType) {
      case 'text':
        return <TextPostForm {...commonProps} />;

      case 'image':
        return (
          <ImagePostForm
            {...commonProps}
            images={formData.images}
            onImagesChange={(images) => updateFormData({ images })}
          />
        );

      case 'video':
        return (
          <VideoPostForm
            {...commonProps}
            videoUrl={formData.videoUrl}
            videoFile={formData.videoFile}
            onVideoUrlChange={(value) =>
              updateFormData({ videoUrl: value, videoFile: null })
            }
            onVideoFileChange={(file) =>
              updateFormData({ videoFile: file, videoUrl: '' })
            }
          />
        );

      case 'link':
        return (
          <LinkPostForm
            {...commonProps}
            linkUrl={formData.linkUrl}
            onLinkUrlChange={(value) => updateFormData({ linkUrl: value })}
          />
        );

      case 'poll':
        return (
          <PollPostForm
            {...commonProps}
            question={formData.pollQuestion}
            options={formData.pollOptions}
            expiresAt={formData.pollExpiresAt}
            onQuestionChange={(value) => updateFormData({ pollQuestion: value })}
            onOptionsChange={(options) => updateFormData({ pollOptions: options })}
            onExpiresAtChange={(date) => updateFormData({ pollExpiresAt: date })}
          />
        );

      default:
        return <TextPostForm {...commonProps} />;
    }
  };

  if (!expanded) {
    return (
      <div
        onClick={() => {
          setExpanded(true);
          setError('');
        }}
        className={`flex items-center gap-3 rounded-2xl border border-[#252a31] bg-[#15181c] px-3 py-3 cursor-pointer transition-colors hover:border-indigo-500/40 ${className}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#252a31] bg-[#0f1318] text-indigo-300">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">Share something with campus...</p>
          <p className="text-xs text-slate-500">Confessions, rants, placements, questions</p>
        </div>
      </div>
    );
  }

  const formContent = (
    <form
      onSubmit={(e) => handleSubmit(e)}
      className={`rounded-2xl border border-[#252a31] bg-[#15181c] ${className}`}
    >
      <div className="p-4">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Create post</h2>
            <p className="text-xs text-slate-400">Share your ideas with the community</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setError('');
            }}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border border-[#252a31] text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <PostTypeSelector
            selectedType={formData.postType}
            onTypeChange={(type) => updateFormData({ postType: type })}
          />
        </div>

        <div className="mb-6">
          <CommunitySelector
            communities={localCommunities}
            selectedCommunity={formData.community}
            onCommunityChange={(community) => updateFormData({ community })}
          />
        </div>

        {renderPostTypeForm()}

        {formData.community !== 'confessions' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">Post identity</label>
            <div className="flex flex-wrap items-center gap-2">
              {(['full', 'partial', 'anonymous'] as const).map((mode) => {
                const isAnonBlocked =
                  mode === 'anonymous' &&
                  !profile.is_email_verified &&
                  requiresEmailForAnonymous(formData.community);
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleDisplayModeChange(mode)}
                    disabled={isAnonBlocked}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      displayMode === mode
                        ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-200'
                        : isAnonBlocked
                        ? 'border-[#252a31] text-slate-600 opacity-50'
                        : 'border-[#252a31] text-slate-300 hover:text-slate-100'
                    }`}
                  >
                    <span>{getDisplayModeLabel(mode)}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Choose how your identity appears. Verification is only needed for anonymous posts in higher-trust spaces.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/40 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#252a31] px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setError('');
            }}
            className="hidden md:block h-10 rounded-lg border border-[#252a31] px-4 text-sm text-slate-300 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(undefined, true)}
            disabled={loading}
            className="h-11 rounded-lg border border-[#252a31] px-4 text-sm text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed md:h-10"
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:shadow-none md:w-auto md:px-8"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Posting...
            </span>
          ) : (
            'Post Now'
          )}
        </button>
      </div>
    </form>
  );

  return (
    <>
      {/* Mobile: bottom sheet overlay */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => {
            setExpanded(false);
            setError('');
          }}
        />
        {/* Sheet */}
        <div className="relative mt-auto max-h-[92vh] overflow-y-auto rounded-t-2xl bg-[#0b0f12] border-t border-[#252a31]">
          {/* Drag indicator */}
          <div className="sticky top-0 z-10 flex justify-center py-2 bg-[#0b0f12] rounded-t-2xl">
            <div className="h-1 w-10 rounded-full bg-slate-600" />
          </div>
          {formContent}
        </div>
      </div>

      {/* Desktop: inline form */}
      <div className="hidden md:block">
        {formContent}
      </div>

      <CollegeEmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
        userRollNumber={profile.roll_number || ''}
      />
    </>
  );

};

export default EnhancedCreatePostForm;
