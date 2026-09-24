'use client';

import React, { useState, useRef } from 'react';


interface ImagePostFormProps {
  headline: string;
  description: string;
  images: File[];
  onHeadlineChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onImagesChange: (images: File[]) => void;
  className?: string;
}

const ImagePostForm: React.FC<ImagePostFormProps> = ({
  headline,
  description,
  images,
  onHeadlineChange,
  onDescriptionChange,
  onImagesChange,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
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
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      onImagesChange([...images, ...files].slice(0, 10)); // Max 10 images
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImagesChange([...images, ...files].slice(0, 10)); // Max 10 images
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`image-post-form ${className}`}>
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

      {/* Image Upload Area */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Images {images.length > 0 && `(${images.length}/10)`}
        </label>
        
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mb-1 text-sm font-medium text-text-primary">
            {dragActive ? 'Drop images here' : 'Drag & drop images here or click to browse'}
          </p>
          <p className="text-xs text-text-secondary">
            Supports: JPG, PNG, GIF, WebP (Max 10MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="h-32 w-full rounded-lg border border-border-primary object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatFileSize(file.size)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rich Text Description */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Add a description to your images..."
          className="min-h-[130px] w-full resize-y rounded-lg border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
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

export default ImagePostForm;
