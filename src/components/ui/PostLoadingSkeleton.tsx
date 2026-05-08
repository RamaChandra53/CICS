'use client';

interface PostLoadingSkeletonProps {
  count?: number;
  className?: string;
}

export default function PostLoadingSkeleton({ count = 3, className = '' }: PostLoadingSkeletonProps) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-[#1a1a1b] border border-[#343536] rounded-[4px] flex animate-pulse">
          <div className="w-10 bg-[#161617]"></div>
          <div className="flex-1 p-2">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"/>
            <div className="h-3 bg-gray-700 rounded w-full mb-1"/>
            <div className="h-3 bg-gray-700 rounded w-3/4"/>
          </div>
        </div>
      ))}
    </div>
  );
}
