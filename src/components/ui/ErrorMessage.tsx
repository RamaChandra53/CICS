'use client';

import { ReactNode } from 'react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
  icon?: ReactNode;
}

export default function ErrorMessage({ 
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  className = '',
  icon
}: ErrorMessageProps) {
  return (
    <div className={`bg-red-900/20 border border-red-800/40 rounded-lg p-4 text-center ${className}`}>
      {icon || <div className="text-2xl mb-2">⚠️</div>}
      <h3 className="text-red-400 font-semibold mb-2">{title}</h3>
      <p className="text-red-300 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}
