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
    <div className={`rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-center ${className}`}>
      {icon || <div className="text-2xl mb-2">⚠️</div>}
      <h3 className="mb-2 font-semibold text-red-600 dark:text-red-400">{title}</h3>
      <p className="mb-4 text-sm text-red-700 dark:text-red-300">{message}</p>
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
