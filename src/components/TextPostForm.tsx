'use client';

import React from 'react';


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
          placeholder="Post title"
          className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-lg font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          maxLength={300}
        />
        <div className="mt-1 text-right text-xs text-text-muted">
          {headline.length}/300 characters
        </div>
      </div>

      {/* Rich Text Description */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Share your thoughts..."
          className="min-h-[150px] w-full resize-y rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          maxLength={5000}
        />
      </div>

      {/* Character count for description */}
      {description && (
        <div className="text-right text-xs text-text-muted">
          {description.length}/5000 characters
        </div>
      )}
    </div>
  );
};

export default TextPostForm;
