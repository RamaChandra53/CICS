'use client';

import React, { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditorModern: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "What's on your mind?",
  className = '',
  minHeight = '120px'
}) => {
  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(value);

  useEffect(() => {
    setIsClient(true);
    setContent(value);
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML || '';
    // Ensure text direction is left-to-right
    e.currentTarget.style.direction = 'ltr';
    e.currentTarget.style.unicodeBidi = 'normal';
    setContent(newContent);
    onChange(newContent);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const newContent = editorRef.current?.innerHTML || '';
    setContent(newContent);
    onChange(newContent);
  };

  const toolbarButtons = [
    { command: 'bold', icon: 'B', title: 'Bold' },
    { command: 'italic', icon: 'I', title: 'Italic' },
    { command: 'underline', icon: 'U', title: 'Underline' },
    { command: 'strikeThrough', icon: 'S', title: 'Strike' },
    { command: 'insertUnorderedList', icon: '•', title: 'Bullet List' },
    { command: 'insertOrderedList', icon: '1.', title: 'Numbered List' },
    { command: 'blockquote', icon: '"', title: 'Quote' }
  ];

  if (!isClient) {
    return (
      <div className={`rich-text-editor ${className}`} style={{ minHeight }}>
        <div className="animate-pulse bg-gray-800 rounded-lg h-32 flex items-center justify-center">
          <div className="text-gray-400">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rich-text-editor ${className}`} style={{ minHeight }}>
      {/* Toolbar */}
      <div className="border border-gray-700 rounded-t-lg bg-gray-800 p-2 flex flex-wrap gap-2">
        {toolbarButtons.map((button) => (
          <button
            key={button.command}
            type="button"
            onClick={() => execCommand(button.command)}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors"
            title={button.title}
          >
            {button.icon}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="border border-gray-700 rounded-b-lg bg-gray-900 text-white p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{ 
          minHeight,
          direction: 'ltr',
          unicodeBidi: 'normal',
          textAlign: 'left'
        }}
        data-placeholder={placeholder}
      />
      
      {/* Placeholder */}
      {!content && (
        <style jsx>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
      )}
    </div>
  );
};

export default RichTextEditorModern;
