'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0b1416] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-gray-800/60 bg-[#1a1a1a] p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-white text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-400 mb-4">
          The page failed to load. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-500"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
