'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Tag {
  name: string;
  category: string;
  usage_count: number;
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  className?: string;
}

export default function TagFilter({ 
  selectedTags, 
  onTagsChange, 
  maxTags = 5,
  className = '' 
}: TagFilterProps) {
  const supabase = createClient();
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        const { data, error } = await supabase
          .from('predefined_tags')
          .select('name, category, usage_count')
          .order('usage_count', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        setPopularTags(data || []);
      } catch (error) {
        console.error('Error fetching popular tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularTags();
  }, [supabase]);

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(tag => tag !== tagName));
    } else if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  const displayTags = showAll ? popularTags : popularTags.slice(0, 8);

  if (loading) {
    return (
      <div className={`tag-filter ${className}`}>
        <div className="flex gap-2 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 w-16 bg-gray-700 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`tag-filter ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Filter by Tags</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map(tag => (
            <div
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded-full"
            >
              <span>#{tag}</span>
              <button
                onClick={() => toggleTag(tag)}
                className="hover:bg-indigo-700 rounded-full p-0.5 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Popular tags */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {displayTags.map(tag => (
            <button
              key={tag.name}
              onClick={() => toggleTag(tag.name)}
              disabled={!selectedTags.includes(tag.name) && selectedTags.length >= maxTags}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                selectedTags.includes(tag.name)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              } ${
                !selectedTags.includes(tag.name) && selectedTags.length >= maxTags
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <span>#{tag.name}</span>
              {tag.usage_count > 0 && (
                <span className="text-xs opacity-70">{tag.usage_count}</span>
              )}
            </button>
          ))}
        </div>

        {popularTags.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showAll ? 'Show Less' : `Show ${popularTags.length - 8} More`}
          </button>
        )}
      </div>

      {selectedTags.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Select up to {maxTags} tags to filter posts
        </p>
      )}
    </div>
  );
}
