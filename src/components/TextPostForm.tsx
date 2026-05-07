'use client';

import React from 'react';
import RichTextEditor from './RichTextEditor';

interface TextPostFormProps {
  headline: string;
  description: string;
  onHeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  className?: string;
}

const TextPostForm: React.FC<TextPostFormProps> = ({
  headline,
  description,
  onHeadlineChange,
  onDescriptionChange,
  className = ''
}) => {
  return (
    <div className={`text-post-form ${className}`}>
      {/* Headline Input */}
      <div className="mb-4">
        <input
          type="text"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="Enter a compelling headline..."
          className="w-full px-4 py-3 bg-[#1a1a1b] border border-[#343536] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-lg font-medium"
          maxLength={300}
        />
        <div className="mt-1 text-xs text-gray-500 text-right">
          {headline.length}/300 characters
        </div>
      </div>

      {/* Rich Text Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Description (optional)
        </label>
        <RichTextEditor
          value={description}
          onChange={onDescriptionChange}
          placeholder="Add more details to your post..."
          minHeight="200px"
        />
      </div>

      {/* Character count for description */}
      {description && (
        <div className="text-xs text-gray-500 text-right">
          {description.replace(/<[^>]*>/g, '').length}/5000 characters
        </div>
      )}
    </div>
  );
};

export default TextPostForm;
