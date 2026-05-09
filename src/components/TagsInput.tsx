'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface PredefinedTag {
  name: string;
  category: string;
  description: string;
  usage_count: number;
}

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  suggestions?: string[];
  showCategories?: boolean;
}

const TagsInput: React.FC<TagsInputProps> = ({
  tags,
  onChange,
  placeholder = "Add tags...",
  maxTags = 10,
  className = '',
  suggestions = [],
  showCategories = true
}) => {
  const supabase = createClient();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<PredefinedTag[]>([]);
  const [predefinedTags, setPredefinedTags] = useState<PredefinedTag[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch predefined tags on mount
  useEffect(() => {
    const fetchPredefinedTags = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('predefined_tags')
          .select('name, category, description, usage_count')
          .order('usage_count', { ascending: false });
        
        if (error) throw error;
        setPredefinedTags(data || []);
      } catch (error) {
        console.error('Error fetching predefined tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPredefinedTags();
  }, [supabase]);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue) {
      const filtered = predefinedTags.filter(
        tag => 
          tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(tag.name)
      ).slice(0, 8);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      // Show popular tags when input is empty
      const popular = predefinedTags
        .filter(tag => !tags.includes(tag.name))
        .slice(0, 5);
      setFilteredSuggestions(popular);
      setShowSuggestions(popular.length > 0);
    }
  }, [inputValue, predefinedTags, tags]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags.length - 1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: PredefinedTag) => {
    addTag(suggestion.name);
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200); // Delay to allow suggestion click
  };

  const handleInputFocus = () => {
    if (inputValue && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`tags-input ${className} relative`}>
      <div className="flex flex-wrap items-center gap-2 p-3 bg-[#1a1a1b] border border-[#343536] rounded-lg focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-colors">
        {/* Render existing tags */}
        {tags.map((tag, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-sm rounded-md"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="hover:bg-indigo-700 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Input field for new tags */}
        {tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
        )}

        {/* Tag count indicator */}
        <div className="text-xs text-gray-500">
          {tags.length}/{maxTags}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 mt-1 w-full bg-[#1a1a1b] border border-[#343536] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {showCategories && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-700">
              Popular Tags
            </div>
          )}
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.name}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#343536] transition-colors first:rounded-t-lg last:rounded-b-lg group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 group-hover:text-indigo-300">#{suggestion.name}</span>
                  {showCategories && (
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                      {suggestion.category}
                    </span>
                  )}
                </div>
                {suggestion.usage_count > 0 && (
                  <span className="text-xs text-gray-500">
                    {suggestion.usage_count}
                  </span>
                )}
              </div>
              {showCategories && suggestion.description && (
                <div className="text-xs text-gray-500 mt-1">
                  {suggestion.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="mt-1 text-xs text-gray-500">
        Press Enter or comma to add tags. Maximum {maxTags} tags allowed.
      </div>
    </div>
  );
};

export default TagsInput;
