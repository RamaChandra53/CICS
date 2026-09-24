'use client';

import React from 'react';
import { Community } from '@/types';

interface CommunitySelectorProps {
  communities: Community[];
  selectedCommunity: string;
  onCommunityChange: (communitySlug: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function CommunitySelector({
  communities,
  selectedCommunity,
  onCommunityChange,
  className = '',
  disabled = false,
}: CommunitySelectorProps) {
  const selected = communities.find((community) => community.slug === selectedCommunity);

  return (
    <div className={className}>
      <label htmlFor="post-community" className="mb-2 block text-sm font-semibold text-text-primary">Community</label>
      <div className="relative">
        <select
          id="post-community"
          value={selectedCommunity}
          onChange={(event) => onCommunityChange(event.target.value)}
          disabled={disabled}
          className={`h-12 w-full appearance-none rounded-lg border border-border-primary bg-bg-secondary px-4 pr-11 text-sm font-medium text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-border-secondary'}`}
        >
          <option value="">Select a community</option>
          {communities.map((community) => <option key={community.slug} value={community.slug}>{community.name}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-3 border-l-2 border-accent-primary px-3 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-sm font-bold text-text-primary">{selected.name[0]?.toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{selected.name}</p>
            {selected.description && <p className="truncate text-xs text-text-secondary">{selected.description}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
