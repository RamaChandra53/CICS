'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, Community } from '@/types';
import CollegeEmailVerificationModal from './CollegeEmailVerificationModal';

import PostTypeSelector, { PostType as PostTypeEnum } from './PostTypeSelector';
import TextPostForm from './TextPostForm';
import ImagePostForm from './ImagePostForm';
import VideoPostForm from './VideoPostForm';
import LinkPostForm from './LinkPostForm';
import PollPostForm from './PollPostForm';

import TagsInput from './TagsInput';
import CommunitySelector from './CommunitySelector';

interface EnhancedCreatePostFormProps {
  profile: Profile;
  communities: Community[];
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
  communities,
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
    if (!profile.is_email_verified && mode !== 'full') {
      setShowVerificationModal(true);
      return;
    }

    setDisplayMode(mode);
    updateFormData({ isAnonymous: mode === 'anonymous' });
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

      case 'partial':
        return profile.branch && profile.year
          ? `${profile.branch}_${profile.year} ✓`
          : 'Verified ✓';

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

      // Insert post using regular client (RLS should allow authenticated users)
      const { error: insertError } = await supabase
        .from('posts')
        .insert(postData);

      if (insertError) {
        throw new Error(insertError.message || 'Failed to create post');
      }

      resetForm();
      setExpanded(false);
      onPostCreated?.();
    } catch (err: unknown) {
      console.error('Post creation error:', err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create post. Please try again.');
      }
    } finally {
      setLoading(false);
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
        className={`flex items-center gap-4 p-4 glass border border-[#343536] rounded-2xl cursor-pointer hover:bg-[#2a2a2b] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${className}`}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-slow">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Share your thoughts with the community..."
            className="w-full bg-transparent text-[#d7dadc] placeholder-gray-500 outline-none cursor-pointer font-medium text-lg"
            readOnly
          />
          <p className="text-gray-500 text-sm mt-1 font-light">Click to create a post • Support for text, images, videos, links & polls</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={(e) => handleSubmit(e)}
        className={`glass rounded-2xl border border-[#343536] shadow-xl ${className}`}
      >
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 font-['Space_Grotesk']">Create Your Post</h2>
            <p className="text-gray-400 text-sm">Share your ideas with the community</p>
          </div>

          <div className="mb-6">
            <PostTypeSelector
              selectedType={formData.postType}
              onTypeChange={(type) => updateFormData({ postType: type })}
            />
          </div>

          <div className="mb-6">
            <CommunitySelector
              communities={communities}
              selectedCommunity={formData.community}
              onCommunityChange={(community) => updateFormData({ community })}
            />
          </div>

          {renderPostTypeForm()}

          <div className="mb-6">
            <TagsInput
              tags={formData.tags}
              onChange={(tags) => updateFormData({ tags })}
              placeholder="Add relevant tags..."
              maxTags={10}
              showCategories={true}
            />
          </div>

          {formData.community !== 'confessions' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3 font-['Space_Grotesk']">Post Identity</label>
              <div className="flex items-center gap-3 flex-wrap">
                {(['full', 'partial', 'anonymous'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleDisplayModeChange(mode)}
                    disabled={!profile.is_email_verified && mode !== 'full'}
                    className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border transition-all duration-300 font-medium font-['Space_Grotesk'] ${
                      displayMode === mode
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/25 transform scale-105'
                        : profile.is_email_verified || mode === 'full'
                        ? 'bg-gray-800/50 text-gray-300 border-gray-600 hover:bg-gray-700/50 hover:text-white hover:border-gray-500 hover:transform hover:scale-105'
                        : 'bg-gray-900/30 text-gray-600 border-gray-700 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        displayMode === mode
                          ? 'bg-white shadow-lg'
                          : profile.is_email_verified || mode === 'full'
                            ? 'bg-gray-400'
                            : 'bg-gray-500'
                      }`}
                    />
                    <span className="font-medium">{getDisplayModeLabel(mode)}</span>
                    {!profile.is_email_verified && mode !== 'full' && (
                      <span className="text-xs ml-1">🔒</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Choose how your identity appears with this post</p>
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

        <div className="flex items-center justify-between border-t border-gray-800/40 px-6 py-4 bg-gray-900/30 backdrop-blur-sm rounded-b-2xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setError('');
              }}
              className="text-gray-400 hover:text-white text-sm px-5 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-800/50 font-medium font-['Space_Grotesk']"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(undefined, true)}
              disabled={loading}
              className="text-gray-400 hover:text-white text-sm px-5 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed font-medium font-['Space_Grotesk']"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white text-sm font-semibold px-8 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-xl font-['Space_Grotesk']"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
