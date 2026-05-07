'use client';

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-bg-secondary rounded-lg h-32"></div>
}) as any;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "What's on your mind?",
  className = '',
  minHeight = '120px'
}) => {

  // Custom toolbar configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'strike', 'code'],
      ['blockquote', { 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
    keyboard: {
      bindings: {
        bold: {
          key: 'b',
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
          metaKey: false,
          handler: function(this: any, range: any, context: any) {
            this.quill.format('bold', !context.format.bold);
          }
        },
        italic: {
          key: 'i',
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
          metaKey: false,
          handler: function(this: any, range: any, context: any) {
            this.quill.format('italic', !context.format.italic);
          }
        }
      }
    }
  };

  const formats = [
    'header',
    'bold', 'italic', 'strike', 'code',
    'blockquote', 'list', 'bullet'
  ];

  // Custom styles for new design system
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ql-editor {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-primary);
        background-color: transparent;
        min-height: ${minHeight};
        padding: 12px;
      }
      
      .ql-editor.ql-blank::before {
        color: var(--text-muted);
        font-style: normal;
      }
      
      .ql-container {
        border: 1px solid var(--border-primary);
        border-radius: 0.75rem;
        background-color: var(--bg-secondary);
        font-family: inherit;
      }
      
      .ql-toolbar {
        border: 1px solid var(--border-primary);
        border-bottom: 1px solid var(--border-primary);
        border-radius: 0.75rem 0.75rem 0 0;
        background-color: var(--bg-secondary);
        padding: 8px;
      }
      
      .ql-toolbar .ql-formats {
        margin-right: 12px;
      }
      
      .ql-toolbar button {
        color: var(--text-muted);
        border: none;
        padding: 4px 6px;
        border-radius: 0.5rem;
        background: transparent;
        transition: all 0.2s ease;
      }
      
      .ql-toolbar button:hover,
      .ql-toolbar button.ql-active {
        color: var(--text-primary);
        background-color: var(--accent-primary);
      }
      
      .ql-toolbar button .ql-stroke {
        stroke: currentColor;
      }
      
      .ql-toolbar button .ql-fill {
        fill: currentColor;
      }
      
      .ql-toolbar .ql-picker {
        color: var(--text-muted);
      }
      
      .ql-toolbar .ql-picker:hover {
        color: var(--text-primary);
      }
      
      .ql-toolbar .ql-picker-label {
        border: none;
        padding: 4px 6px;
        border-radius: 0.5rem;
        background: transparent;
      }
      
      .ql-toolbar .ql-picker-label:hover {
        background-color: var(--accent-primary);
      }
      
      .ql-toolbar .ql-picker-options {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-primary);
        border-radius: 0.5rem;
        padding: 4px;
        box-shadow: 0 4px 12px rgba(0, 217, 255, 0.15);
      }
      
      .ql-toolbar .ql-picker-item {
        color: var(--text-primary);
        padding: 4px 8px;
        border-radius: 0.5rem;
      }
      
      .ql-toolbar .ql-picker-item:hover {
        background-color: var(--accent-primary);
      }
      
      .ql-toolbar .ql-picker-item.ql-selected {
        background-color: var(--accent-primary);
        color: white;
      }
      
      .ql-toolbar .ql-separator {
        border-left: 1px solid var(--border-primary);
        margin: 0 4px;
      }
      
      /* Custom styling for content */
      .ql-editor h1 {
        font-size: 1.5em;
        font-weight: 600;
        margin: 0.5em 0;
        color: var(--text-primary);
      }
      
      .ql-editor h2 {
        font-size: 1.3em;
        font-weight: 600;
        margin: 0.5em 0;
        color: var(--text-primary);
      }
      
      .ql-editor h3 {
        font-size: 1.1em;
        font-weight: 600;
        margin: 0.5em 0;
        color: var(--text-primary);
      }
      
      .ql-editor strong {
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .ql-editor em {
        font-style: italic;
        color: var(--text-primary);
      }
      
      .ql-editor del {
        text-decoration: line-through;
        color: var(--text-muted);
      }
      
      .ql-editor code {
        background-color: var(--bg-tertiary);
        color: var(--accent-secondary);
        padding: 2px 4px;
        border-radius: 0.25rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9em;
      }
      
      .ql-editor blockquote {
        border-left: 4px solid var(--accent-primary);
        margin: 0.5em 0;
        padding-left: 1em;
        color: var(--text-secondary);
        font-style: italic;
      }
      
      .ql-editor ul,
      .ql-editor ol {
        margin: 0.5em 0;
        padding-left: 1.5em;
      }
      
      .ql-editor li {
        margin: 0.25em 0;
        color: var(--text-primary);
      }
      
      .ql-editor a {
        color: var(--accent-primary);
        text-decoration: none;
      }
      
      .ql-editor a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [minHeight]);

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        theme="snow"
      />
    </div>
  );
};

export default RichTextEditor;
