'use client';

import React, { useState, useRef } from 'react';
import RichTextEditorModern from './RichTextEditorModern';

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
          placeholder="Enter a compelling headline..."
          className="w-full px-4 py-3 bg-[#1a1a1b] border border-[#343536] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-lg font-medium"
          maxLength={300}
        />
        <div className="mt-1 text-xs text-gray-500 text-right">
          {headline.length}/300 characters
        </div>
      </div>

      {/* Image Upload Area */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Images {images.length > 0 && `(${images.length}/10)`}
        </label>
        
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-400 mb-2">
            {dragActive ? 'Drop images here' : 'Drag & drop images here or click to browse'}
          </p>
          <p className="text-xs text-gray-500">
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
                  className="w-full h-32 object-cover rounded-lg border border-[#343536]"
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
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Description (optional)
        </label>
        <RichTextEditorModern
          value={description}
          onChange={onDescriptionChange}
          placeholder="Add a description to your images..."
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

export default ImagePostForm;
