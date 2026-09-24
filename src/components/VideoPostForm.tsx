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
          placeholder="Post title"
          className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-lg font-semibold text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          maxLength={300}
        />
        <div className="mt-1 text-right text-xs text-text-muted">
          {headline.length}/300 characters
        </div>
      </div>

      {/* Video Input Mode Selector */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Video Source
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              inputMode === 'url'
                ? 'border-accent-primary bg-accent-primary text-white'
                : 'border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1 1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1-1" /></svg>
            Video URL
          </button>
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              inputMode === 'upload'
                ? 'border-accent-primary bg-accent-primary text-white'
                : 'border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M5 20h14" /></svg>
            Upload
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
              className="w-full rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 pr-10 text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            />
            {videoUrl && (
              <button
                type="button"
                onClick={clearVideoUrl}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
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
          <p className="mt-1 text-xs text-text-secondary">
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
                ? 'border-accent-primary bg-bg-tertiary'
                : 'border-border-secondary bg-bg-secondary hover:border-accent-primary'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="mx-auto mb-3 h-9 w-9 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="mb-1 text-sm font-medium text-text-primary">
              {dragActive ? 'Drop video here' : 'Drag & drop video here or click to browse'}
            </p>
            <p className="text-xs text-text-secondary">
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
            <div className="mt-4 rounded-lg border border-border-primary bg-bg-tertiary p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{videoFile.name}</p>
                    <p className="text-xs text-text-secondary">{formatFileSize(videoFile.size)}</p>
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
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Write a detailed description of your video..."
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

export default VideoPostForm;
