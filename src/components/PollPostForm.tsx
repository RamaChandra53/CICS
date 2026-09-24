'use client';

import React, { useState } from 'react';


interface PollPostFormProps {
  headline: string;
  question: string;
  options: string[];
  expiresAt: string | null;
  description: string;
  onHeadlineChange: (value: string) => void;
  onQuestionChange: (value: string) => void;
  onOptionsChange: (options: string[]) => void;
  onExpiresAtChange: (date: string | null) => void;
  onDescriptionChange: (value: string) => void;
  className?: string;
}

const PollPostForm: React.FC<PollPostFormProps> = ({
  headline,
  question,
  options,
  expiresAt,
  description,
  onHeadlineChange,
  onQuestionChange,
  onOptionsChange,
  onExpiresAtChange,
  onDescriptionChange,
  className = ''
}) => {
  const [expiryDuration, setExpiryDuration] = useState<string>('1day');

  // Add new option
  const addOption = () => {
    if (options.length < 6) {
      onOptionsChange([...options, '']);
    }
  };

  // Remove option
  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onOptionsChange(newOptions);
  };

  // Update option
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onOptionsChange(newOptions);
  };

  // Handle expiry duration change
  const handleExpiryDurationChange = (duration: string) => {
    setExpiryDuration(duration);
    
    const now = new Date();
    let expiresAt: Date;
    
    switch (duration) {
      case '1hour':
        expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '6hours':
        expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        break;
      case '1day':
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '3days':
        expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case '1week':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'never':
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year as "never"
        break;
      default:
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    
    onExpiresAtChange(expiresAt.toISOString());
  };

  const getExpiryLabel = (duration: string) => {
    switch (duration) {
      case '1hour': return '1 hour';
      case '6hours': return '6 hours';
      case '1day': return '1 day';
      case '3days': return '3 days';
      case '1week': return '1 week';
      case 'never': return 'Never';
      default: return '1 day';
    }
  };

  return (
    <div className={`poll-post-form ${className}`}>
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

      {/* Poll Question */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Poll Question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="What would you like to ask?"
          className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          maxLength={200}
        />
        <div className="mt-1 text-right text-xs text-text-muted">
          {question.length}/200 characters
        </div>
      </div>

      {/* Poll Options */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-text-primary">
            Poll Options ({options.length}/6)
          </label>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="rounded-lg border border-accent-primary px-3 py-1 text-xs font-semibold text-accent-primary transition-colors hover:bg-bg-tertiary"
            >
              + Add Option
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-tertiary text-sm font-medium text-text-secondary">
                {String.fromCharCode(65 + index)} {/* A, B, C, D, E, F */}
              </div>
              <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                className="min-w-0 flex-1 rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="w-8 h-8 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        
        {options.length < 2 && (
          <p className="mt-2 text-xs text-yellow-400">
            Minimum 2 options required
          </p>
        )}
      </div>

      {/* Poll Expiry */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Poll Duration
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['1hour', '6hours', '1day', '3days', '1week', 'never'].map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => handleExpiryDurationChange(duration)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                expiryDuration === duration
                  ? 'bg-accent-primary text-white'
                  : 'border border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              {getExpiryLabel(duration)}
            </button>
          ))}
        </div>
        
        {expiresAt && expiryDuration !== 'never' && (
          <p className="mt-2 text-xs text-text-secondary">
            Poll ends: {new Date(expiresAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Description Input */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Additional Context (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Add context or explain why this poll matters..."
          className="min-h-[130px] w-full resize-y rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          maxLength={5000}
        />
        {description && (
          <div className="mt-1 text-right text-xs text-text-muted">
            {description.length}/5000 characters
          </div>
        )}
      </div>


    </div>
  );
};

export default PollPostForm;
