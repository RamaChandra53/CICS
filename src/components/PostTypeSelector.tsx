'use client';

import React, { ReactNode } from 'react';

export type PostType = 'text' | 'image' | 'video' | 'poll' | 'link';

interface PostTypeSelectorProps {
  selectedType: PostType;
  onTypeChange: (type: PostType) => void;
  className?: string;
}

interface PostTypeOption {
  type: PostType;
  icon: ReactNode;
  label: string;
  description: string;
}

const iconClassName = 'h-5 w-5';

const postTypes: PostTypeOption[] = [
  {
    type: 'text',
    label: 'Text',
    description: 'Write a question, update, or story.',
    icon: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 6h14M5 11h14M5 16h9" /></svg>,
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Share up to ten images.',
    icon: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 5" /></svg>,
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Add a video file or URL.',
    icon: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /></svg>,
  },
  {
    type: 'link',
    label: 'Link',
    description: 'Share a useful page or resource.',
    icon: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></svg>,
  },
  {
    type: 'poll',
    label: 'Poll',
    description: 'Ask a question and collect votes.',
    icon: <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 20V10M12 20V4M19 20v-7" /></svg>,
  },
];

export default function PostTypeSelector({ selectedType, onTypeChange, className = '' }: PostTypeSelectorProps) {
  const selected = postTypes.find((postType) => postType.type === selectedType);

  return (
    <div className={className}>
      <div className="grid grid-cols-5 gap-1 rounded-lg border border-border-primary bg-bg-tertiary p-1">
        {postTypes.map((postType) => {
          const active = selectedType === postType.type;
          return (
            <button
              key={postType.type}
              type="button"
              onClick={() => onTypeChange(postType.type)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2.5 text-xs font-semibold transition-colors ${active ? 'bg-bg-card text-accent-primary shadow-sm' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
              aria-pressed={active}
              title={postType.description}
            >
              {postType.icon}
              <span className="truncate">{postType.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-text-secondary">{selected?.description}</p>
    </div>
  );
}
