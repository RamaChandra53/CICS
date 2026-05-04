'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
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
              <Link
                href="/feed"
                className="block w-full bg-[#0079d3] hover:bg-[#1a76d3] text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                Go back to Feed
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-400 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// For functional components that need error boundaries
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
