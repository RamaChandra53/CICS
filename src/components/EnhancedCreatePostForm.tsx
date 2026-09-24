'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, type PublishingIdentity } from '@/types';
import type { CommunitySummary } from '@/types/domain';
import IdentityPicker from './IdentityPicker';

import PostTypeSelector, { PostType as PostTypeEnum } from './PostTypeSelector';
import TextPostForm from './TextPostForm';
import ImagePostForm from './ImagePostForm';
import VideoPostForm from './VideoPostForm';
import LinkPostForm from './LinkPostForm';
import PollPostForm from './PollPostForm';


import CommunitySelector from './CommunitySelector';
import { createPost } from '@/lib/services/posts';
import { fetchUserCommunities } from '@/lib/services/communities';
import { getDefaultPublishingIdentity, getPostIdentityDisplay } from '@/lib/identityDisplay';

interface EnhancedCreatePostFormProps {
  profile: Profile;
  defaultCommunity?: string;
  onPostCreated?: () => void;
  className?: string;
  openSignal?: number;
  presentation?: 'overlay' | 'page';
  initialExpanded?: boolean;
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
  openSignal,
  presentation = 'overlay',
  initialExpanded = false,
}) => {
  const supabase = createClient();

  const [expanded, setExpanded] = useState(initialExpanded);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayMode, setDisplayMode] = useState<PublishingIdentity>(() =>
    getDefaultPublishingIdentity(profile)
  );
  const [localCommunities, setLocalCommunities] = useState<CommunitySummary[]>([]);
  const lastOpenSignal = useRef<number | null>(null);

  useEffect(() => {
    if (openSignal === undefined) return;
    if (lastOpenSignal.current === null) {
      lastOpenSignal.current = openSignal;
      return;
    }
    if (lastOpenSignal.current === openSignal) return;
    lastOpenSignal.current = openSignal;
    setExpanded(true);
    setError('');
  }, [openSignal]);

  useEffect(() => {
    const loadCommunities = async () => {
      try {
        const memberships = await fetchUserCommunities(supabase, profile.id);
        setLocalCommunities(memberships);
      } catch (err) {
        console.error('Failed to fetch communities for form:', err);
      }
    };
    loadCommunities();
  }, [profile.id, supabase]);

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

  const handleCommunityChange = (community: string) => {
    updateFormData({ community });
  };

  const handleDisplayModeChange = (mode: PublishingIdentity) => {
    setDisplayMode(mode);
    updateFormData({ isAnonymous: mode === 'anonymous' });
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

    setDisplayMode(getDefaultPublishingIdentity(profile));
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

      const headline = formData.headline.trim();
      const description = formData.description.trim();
      const validPollOptions = formData.pollOptions
        .map((option) => option.trim())
        .filter(Boolean);

      const postData = {
        author_id: profile.id,
        room: formData.community,
        content: headline + (description ? `\n\n${description}` : ''),
        post_type: formData.postType,
        headline,
        description: description || null,
        tags: formData.tags,
        community_slug: formData.community,
        is_draft: saveAsDraft,
        image_url: imageUrl,
        video_url: videoUrl,
        link_url: formData.postType === 'link' ? formData.linkUrl.trim() : null,
        poll_options: formData.postType === 'poll' ? validPollOptions : null,
        poll_expires_at: formData.postType === 'poll' ? formData.pollExpiresAt : null,
        is_anon_post: formData.isAnonymous || false,
        display_mode: displayMode,
        author_name_snapshot: displayMode === 'anonymous'
          ? null
          : getPostIdentityDisplay(profile, displayMode).displayName,
        year_tag: profile.year || null,
        branch_tag: profile.branch || null,
        section_tag: profile.section || null,
        upvotes: 0,
        downvotes: 0,
      };

      await createPost(supabase, postData);

      resetForm();
      setExpanded(false);
      onPostCreated?.();
      setLoading(false);
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
    return null;
  }

  const formContent = (
    <form
      onSubmit={(e) => handleSubmit(e)}
      className={`overflow-hidden rounded-xl border border-border-primary bg-bg-card ${className}`}
    >
      <div className="p-4">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Create post</h2>
            <p className="text-xs text-text-muted">Choose a community and share what is on your mind.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setError('');
            }}
            className={`${presentation === 'page' ? 'hidden' : 'flex'} md:hidden h-8 w-8 items-center justify-center text-text-muted hover:text-text-primary`}
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5">
          <PostTypeSelector
            selectedType={formData.postType}
            onTypeChange={(type) => updateFormData({ postType: type })}
          />
        </div>

        <div className="mb-5">
          <CommunitySelector
            communities={localCommunities}
            selectedCommunity={formData.community}
            onCommunityChange={handleCommunityChange}
          />
        </div>

        {renderPostTypeForm()}

        <div className="mb-6">
          <IdentityPicker value={displayMode} onChange={handleDisplayModeChange} profile={profile} />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border-primary bg-bg-tertiary px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {presentation !== 'page' && (
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setError('');
              }}
              className="hidden h-10 rounded-lg border border-border-primary bg-bg-secondary px-4 text-sm text-text-secondary hover:text-text-primary md:block"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSubmit(undefined, true)}
            disabled={loading}
            className="h-11 rounded-lg border border-border-primary bg-bg-secondary px-4 text-sm text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 md:h-10"
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-accent-primary text-sm font-semibold text-white transition-colors hover:bg-accent-secondary disabled:opacity-50 md:w-auto md:px-8"
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

  if (presentation === 'page') {
    return <div>{formContent}</div>;
  }

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
        <div className="relative mt-auto max-h-[92vh] overflow-y-auto rounded-t-2xl border-t border-border-primary bg-bg-primary">
          {/* Drag indicator */}
          <div className="sticky top-0 z-10 flex justify-center rounded-t-2xl bg-bg-primary py-2">
            <div className="h-1 w-10 rounded-full bg-border-secondary" />
          </div>
          {formContent}
        </div>
      </div>

      {/* Desktop: inline form */}
      <div className="hidden md:block">
        {formContent}
      </div>
    </>
  );

};

export default EnhancedCreatePostForm;
