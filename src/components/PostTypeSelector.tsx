'use client';

import React from 'react';

export type PostType = 'text' | 'image' | 'video' | 'poll' | 'link';

interface PostTypeSelectorProps {
  selectedType: PostType;
  onTypeChange: (type: PostType) => void;
  className?: string;
}

interface PostTypeOption {
  type: PostType;
  icon: string;
  label: string;
  description: string;
}

const PostTypeSelector: React.FC<PostTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  className = ''
}) => {
  const postTypes: PostTypeOption[] = [
    {
      type: 'text',
      icon: '📝',
      label: 'Text',
      description: 'Recommended for the alpha: questions, confessions, and campus updates'
    },
    {
      type: 'image',
      icon: '🖼️',
      label: 'Image',
      description: 'Share images with optional description'
    },
    {
      type: 'video',
      icon: '🎥',
      label: 'Video',
      description: 'Share videos or video links'
    },
    {
      type: 'link',
      icon: '🔗',
      label: 'Link',
      description: 'Share interesting links'
    },
    {
      type: 'poll',
      icon: '📊',
      label: 'Poll',
      description: 'Create polls with multiple options'
    }
  ];

  return (
    <div className={`post-type-selector ${className}`}>
      <div className="flex flex-wrap gap-2 p-1 bg-[#1a1a1b] rounded-lg border border-[#343536]">
        {postTypes.map((postType) => (
          <button
            key={postType.type}
            type="button"
            onClick={() => onTypeChange(postType.type)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${selectedType === postType.type
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#343536]'
              }
            `}
            title={postType.description}
          >
            <span className="text-lg">{postType.icon}</span>
            <span>{postType.label}</span>
          </button>
        ))}
      </div>
      
      {/* Description for selected type */}
      <div className="mt-2 text-xs text-gray-500">
        {postTypes.find(postType => postType.type === selectedType)?.description}
      </div>
    </div>
  );
};

export default PostTypeSelector;
