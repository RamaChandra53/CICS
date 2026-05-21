'use client';

import React, { useState, useRef } from 'react';


interface VideoPostFormProps {
  headline: string;
  description: string;
  videoUrl: string;
  videoFile: File | null;
  onHeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
  onVideoFileChange: (file: File | null) => void;
  className?: string;
}

const VideoPostForm: React.FC<VideoPostFormProps> = ({
  headline,
  description,
  videoUrl,
  videoFile,
  onHeadlineChange,
  onDescriptionChange,
  onVideoUrlChange,
  onVideoFileChange,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('video/')
    );
    
    if (files.length > 0) {
      onVideoFileChange(files[0]); // Only one video file
      onVideoUrlChange(''); // Clear URL when file is selected
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoFileChange(file);
      onVideoUrlChange(''); // Clear URL when file is selected
    }
  };

  const clearVideoFile = () => {
    onVideoFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearVideoUrl = () => {
    onVideoUrlChange('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className={`video-post-form ${className}`}>
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

      {/* Video Input Mode Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Video Source
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'url'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'bg-[#343536] text-gray-400 hover:text-gray-200'
            }`}
          >
            📎 Video URL
          </button>
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputMode === 'upload'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'bg-[#343536] text-gray-400 hover:text-gray-200'
            }`}
          >
            📤 Upload Video
          </button>
        </div>
      </div>

      {/* Video URL Input */}
      {inputMode === 'url' && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => onVideoUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              className="w-full px-4 py-3 pr-10 bg-[#1a1a1b] border border-[#343536] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {videoUrl && (
              <button
                type="button"
                onClick={clearVideoUrl}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {videoUrl && !isValidUrl(videoUrl) && (
            <p className="mt-1 text-xs text-red-400">Please enter a valid URL</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Supports YouTube, Vimeo, and other video platforms
          </p>
        </div>
      )}

      {/* Video Upload */}
      {inputMode === 'upload' && (
        <div className="mb-4">
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${dragActive 
                ? 'border-indigo-500 bg-indigo-500/10' 
                : 'border-[#343536] hover:border-gray-500 bg-[#1a1a1b]'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 mb-2">
              {dragActive ? 'Drop video here' : 'Drag & drop video here or click to browse'}
            </p>
            <p className="text-xs text-gray-500">
              Supports: MP4, WebM, MOV (Max 100MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Video File Preview */}
          {videoFile && (
            <div className="mt-4 p-3 bg-[#343536] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{videoFile.name}</p>
                    <p className="text-gray-400 text-xs">{formatFileSize(videoFile.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearVideoFile}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Write a detailed description of your video..."
          className="w-full px-4 py-3 bg-[#1a1a1b] border border-[#343536] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm min-h-[120px] resize-y"
          maxLength={5000}
        />
        {description && (
          <div className="mt-1 text-xs text-gray-500 text-right">
            {description.length}/5000 characters
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPostForm;

