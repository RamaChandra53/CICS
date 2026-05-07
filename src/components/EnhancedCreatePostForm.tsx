'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, Community, PostType } from '@/types';
import EmailVerificationModal from './EmailVerificationModal';

// Import post type components
import PostTypeSelector, { PostType as PostTypeEnum } from './PostTypeSelector';
import TextPostForm from './TextPostForm';
import ImagePostForm from './ImagePostForm';
import VideoPostForm from './VideoPostForm';
import LinkPostForm from './LinkPostForm';
import PollPostForm from './PollPostForm';

// Import utility components
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
  
  // Type-specific fields
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
  className = ''
}) => {
  const supabase = createClient();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [displayMode, setDisplayMode] = useState<'full' | 'partial' | 'anonymous'>('full');

  // Form data state
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
    pollOptions: ['', ''], // Start with 2 empty options
    pollExpiresAt: null
  });

  // Update form data
  const updateFormData = (updates: Partial<PostFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Handle display mode change
  const handleDisplayModeChange = (mode: 'full' | 'partial' | 'anonymous') => {
    if (!profile.is_email_verified && mode !== 'full') {
      setShowVerificationModal(true);
      return;
    }
    setDisplayMode(mode);
    updateFormData({ isAnonymous: mode === 'anonymous' });
  };

  // Handle verification success
  const handleVerificationSuccess = () => {
    // This would update the profile state in a real app
    console.log('Email verified successfully');
  };

  // Get display mode label
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

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.headline.trim()) {
      return 'Headline is required';
    }

    if (formData.postType === 'poll') {
      if (!formData.pollQuestion.trim()) {
        return 'Poll question is required';
      }
      const validOptions = formData.pollOptions.filter(opt => opt.trim());
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();
    
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
      let linkMetadata: any = null;

      // Handle image uploads
      if (formData.postType === 'image' && formData.images.length > 0) {
        const imageUrls = [];
        for (const image of formData.images) {
          const fileExt = image.name.split('.').pop();
          const filePath = `${profile.id}/${Date.now()}_${image.name}`;
          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(filePath, image);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);
          imageUrls.push(publicUrl);
        }
        imageUrl = imageUrls[0]; // For now, use first image as primary
      }

      // Handle video upload
      if (formData.postType === 'video' && formData.videoFile) {
        const fileExt = formData.videoFile.name.split('.').pop();
        const filePath = `${profile.id}/${Date.now()}_${formData.videoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('post-videos')
          .upload(filePath, formData.videoFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('post-videos')
          .getPublicUrl(filePath);
        videoUrl = publicUrl;
      } else if (formData.postType === 'video' && formData.videoUrl) {
        videoUrl = formData.videoUrl;
      }

      // Handle link metadata
      if (formData.postType === 'link' && formData.linkUrl) {
        try {
          const response = await fetch(`/api/link-preview?url=${encodeURIComponent(formData.linkUrl)}`);
          if (response.ok) {
            linkMetadata = await response.json();
          }
        } catch (err) {
          console.error('Failed to fetch link metadata:', err);
        }
      }

      // Prepare post data
      const postData: Record<string, unknown> = {
        author_id: profile.id,
        room: formData.community,
        post_type: formData.postType,
        headline: formData.headline.trim(),
        description: formData.description.trim() || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        community_slug: formData.community,
        is_draft: saveAsDraft,
        display_mode: displayMode,
        image_url: imageUrl,
        video_url: videoUrl,
        link_url: formData.linkUrl || null,
        link_metadata: linkMetadata,
        poll_options: formData.postType === 'poll' ? formData.pollOptions.filter(opt => opt.trim()) : null,
        poll_expires_at: formData.pollExpiresAt,
      };

      // Insert post
      const { error: insertError } = await supabase.from('posts').insert(postData);
      if (insertError) throw insertError;

      // Reset form
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
        pollExpiresAt: null
      });
      
      setExpanded(false);
      onPostCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render post type specific form
  const renderPostTypeForm = () => {
    const commonProps = {
      headline: formData.headline,
      description: formData.description,
      onHeadlineChange: (value: string) => updateFormData({ headline: value }),
      onDescriptionChange: (value: string) => updateFormData({ description: value }),
      className: 'mb-4'
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
            onVideoUrlChange={(value) => updateFormData({ videoUrl: value, videoFile: null })}
            onVideoFileChange={(file) => updateFormData({ videoFile: file, videoUrl: '' })}
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
        onClick={() => { setExpanded(true); setError(''); }}
        className="flex items-center gap-3 p-3 bg-[#1a1a1b] border border-[#343536] rounded-lg cursor-pointer hover:bg-[#2a2a2b] transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Create a post..."
          className="flex-1 bg-transparent text-[#d7dadc] placeholder-gray-500 outline-none cursor-pointer"
          readOnly
        />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={(e) => handleSubmit(e)} className="bg-[#1a1a1b] border border-[#343536] rounded-lg">
        <div className="p-4">
          {/* Post Type Selector */}
          <div className="mb-4">
            <PostTypeSelector
              selectedType={formData.postType}
              onTypeChange={(type) => updateFormData({ postType: type })}
            />
          </div>

          {/* Community Selector */}
          <div className="mb-4">
            <CommunitySelector
              communities={communities}
              selectedCommunity={formData.community}
              onCommunityChange={(community) => updateFormData({ community })}
            />
          </div>

          {/* Post Type Specific Form */}
          {renderPostTypeForm()}

          {/* Tags Input */}
          <div className="mb-4">
            <TagsInput
              tags={formData.tags}
              onChange={(tags) => updateFormData({ tags })}
              placeholder="Add relevant tags..."
              maxTags={10}
              suggestions={['announcement', 'question', 'discussion', 'meme', 'news', 'event', 'help', 'study', 'career']}
            />
          </div>

          {/* Anonymous Toggle */}
          {formData.community !== 'confessions' && (
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Post as:</span>
                {(['full', 'partial', 'anonymous'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleDisplayModeChange(mode)}
                    disabled={!profile.is_email_verified && mode !== 'full'}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border transition-all duration-200 font-medium ${
                      displayMode === mode
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                        : profile.is_email_verified || mode === 'full'
                        ? 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700/50 hover:text-gray-300 hover:border-gray-600'
                        : 'bg-gray-900/30 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      displayMode === mode
                        ? 'bg-white'
                        : profile.is_email_verified || mode === 'full'
                        ? 'bg-gray-500'
                        : 'bg-gray-600'
                    }`} />
                    <span>{getDisplayModeLabel(mode)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-gray-800/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setExpanded(false); setError(''); }}
              className="text-gray-500 hover:text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="text-gray-500 hover:text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Save Draft
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium px-6 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
      />
    </>
  );
};

export default EnhancedCreatePostForm;
