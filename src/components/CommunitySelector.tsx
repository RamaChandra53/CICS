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

const CommunitySelector: React.FC<CommunitySelectorProps> = ({
  communities,
  selectedCommunity,
  onCommunityChange,
  className = '',
  disabled = false
}) => {
  const selectedCommunityData = communities.find(c => c.slug === selectedCommunity);

  return (
    <div className={`community-selector ${className}`}>
      <label className="block text-xs font-medium text-slate-400 mb-2">
        Community
      </label>
      
      <div className="relative">
        <select
          value={selectedCommunity}
          onChange={(e) => onCommunityChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full rounded-xl border border-[#252a31] bg-[#0f1318] px-3 py-2.5 pr-10 text-sm text-white
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'}
          `}
        >
          <option value="">Select a community...</option>
          {communities.map((community) => (
            <option key={community.slug} value={community.slug}>
              {community.icon} {community.name}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Community info */}
      {selectedCommunityData && (
        <div className="mt-2 rounded-xl border border-[#252a31] bg-[#0f1318] p-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{selectedCommunityData.icon}</div>
            <div className="flex-1">
              <h3 className="text-white font-medium text-sm">{selectedCommunityData.name}</h3>
              <p className="text-slate-500 text-xs">{selectedCommunityData.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-1 text-xs text-slate-500">
        Choose the community where you want to post
      </div>
    </div>
  );
};

export default CommunitySelector;
