'use client';

interface PostLoadingSkeletonProps {
  count?: number;
  className?: string;
}

export default function PostLoadingSkeleton({ count = 3, className = '' }: PostLoadingSkeletonProps) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex animate-pulse rounded-[4px] border border-border-primary bg-bg-card">
          <div className="w-10 bg-bg-tertiary"></div>
          <div className="flex-1 p-2">
            <div className="mb-2 h-4 w-1/3 rounded bg-bg-tertiary"/>
            <div className="mb-1 h-3 w-full rounded bg-bg-tertiary"/>
            <div className="h-3 w-3/4 rounded bg-bg-tertiary"/>
          </div>
        </div>
      ))}
    </div>
  );
}
