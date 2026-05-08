'use client';

import React, { useState, useCallback, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function ErrorBoundaryComponent({ children, fallback }: Props) {
  const [errorState, setErrorState] = useState<ErrorBoundaryState>({
    hasError: false,
  });

  const resetError = useCallback(() => {
    setErrorState({ hasError: false, error: undefined });
  }, []);

  // Global error handler for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      console.error('Promise rejection details:', {
        reason: event.reason,
        type: typeof event.reason,
        stack: event.reason instanceof Error ? event.reason.stack : 'No stack available'
      });
      
      // Try to prevent the default browser behavior
      event.preventDefault();
      
      setErrorState({
        hasError: true,
        error: event.reason instanceof Error ? event.reason : new Error(`Unhandled promise rejection: ${JSON.stringify(event.reason)}`)
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (errorState.hasError) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="min-h-screen bg-[#0b1416] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-[#d7dadc] text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-6">
            We encountered an unexpected error. This has been logged and we'll work to fix it.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/feed'}
              className="block w-full bg-[#0079d3] hover:bg-[#1a76d3] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              Go back to Feed
            </button>
            <button
              onClick={resetError}
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && errorState.error && (
            <details className="mt-6 text-left">
              <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
                {errorState.error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Error boundary with modern React patterns
export default function ErrorBoundaryFunctional({ children, fallback }: Props) {
  return (
    <ErrorBoundaryComponent fallback={fallback}>
      {children}
    </ErrorBoundaryComponent>
  );
}

// Error fallback component for Suspense
export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0b1416] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-[#d7dadc] text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-sm mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="block w-full bg-[#0079d3] hover:bg-[#1a76d3] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
