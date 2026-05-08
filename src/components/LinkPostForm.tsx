'use client';

import React, { useState, useEffect } from 'react';
import RichTextEditorModern from './RichTextEditorModern';

interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
}

interface LinkPostFormProps {
  headline: string;
  description: string;
  linkUrl: string;
  onHeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLinkUrlChange: (value: string) => void;
  className?: string;
}

const LinkPostForm: React.FC<LinkPostFormProps> = ({
  headline,
  description,
  linkUrl,
  onHeadlineChange,
  onDescriptionChange,
  onLinkUrlChange,
  className = ''
}) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Function to fetch link metadata
  const fetchMetadata = async (url: string) => {
    if (!url.trim()) {
      setMetadata(null);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create a simple API endpoint for metadata fetching
      // In a real app, you'd want to create a server-side endpoint for this
      // to avoid CORS issues and for better security
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch link metadata');
      }

      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Could not fetch link preview');
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced metadata fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (linkUrl && isValidUrl(linkUrl)) {
        fetchMetadata(linkUrl);
      } else {
        setMetadata(null);
        setError('');
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [linkUrl]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const clearLinkUrl = () => {
    onLinkUrlChange('');
    setMetadata(null);
    setError('');
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className={`link-post-form ${className}`}>
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

      {/* Link URL Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Link URL
        </label>
        <div className="relative">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => onLinkUrlChange(e.target.value)}
            placeholder="https://example.com/article..."
            className="w-full px-4 py-3 pr-10 bg-[#1a1a1b] border border-[#343536] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          {linkUrl && (
            <button
              type="button"
              onClick={clearLinkUrl}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {linkUrl && !isValidUrl(linkUrl) && (
          <p className="mt-1 text-xs text-red-400">Please enter a valid URL</p>
        )}
        
        {linkUrl && isValidUrl(linkUrl) && (
          <p className="mt-1 text-xs text-gray-500">
            Domain: {getDomainFromUrl(linkUrl)}
          </p>
        )}

        {isLoading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Fetching link preview...
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Link Preview */}
      {metadata && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Link Preview
          </label>
          <div className="bg-[#343536] border border-[#4a4a4b] rounded-lg p-4 hover:border-[#5a5a5b] transition-colors">
            <div className="flex gap-4">
              {metadata.image && (
                <div className="flex-shrink-0">
                  <img
                    src={metadata.image}
                    alt={metadata.title || 'Link preview'}
                    className="w-24 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {metadata.siteName && (
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                    {metadata.siteName}
                  </div>
                )}
                <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                  {metadata.title || 'No title available'}
                </h3>
                {metadata.description && (
                  <p className="text-gray-400 text-xs line-clamp-3">
                    {metadata.description}
                  </p>
                )}
                <div className="text-xs text-indigo-400 mt-2 truncate">
                  {getDomainFromUrl(linkUrl)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rich Text Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Description (optional)
        </label>
        <RichTextEditorModern
          value={description}
          onChange={onDescriptionChange}
          placeholder="Share your thoughts about this link..."
          className="mb-4"
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

export default LinkPostForm;
