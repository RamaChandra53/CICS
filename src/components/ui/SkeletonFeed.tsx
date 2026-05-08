'use client';

interface SkeletonFeedProps {
  count?: number;
}

export default function SkeletonFeed({ count = 5 }: SkeletonFeedProps) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="glass rounded-xl overflow-hidden animate-pulse">
          <div className="flex">
            {/* Vote Column Skeleton */}
            <div className="w-12 bg-bg-secondary/50 flex flex-col items-center py-3 border-r border-border-primary">
              <div className="w-6 h-6 bg-gray-700 rounded mb-2"></div>
              <div className="w-6 h-6 bg-gray-700 rounded"></div>
            </div>

            {/* Content Column Skeleton */}
            <div className="flex-1 p-4">
              {/* Meta Info Skeleton */}
              <div className="flex items-center text-xs mb-2">
                <div className="h-4 bg-gray-700 rounded w-20 mr-2"></div>
                <div className="h-4 bg-gray-700 rounded w-24 mr-2"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>

              {/* Title Skeleton */}
              <div className="h-6 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>

              {/* Body Preview Skeleton */}
              <div className="h-4 bg-gray-700 rounded w-full mb-1"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6 mb-1"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3 mb-3"></div>

              {/* Image Skeleton */}
              <div className="h-48 bg-gray-700 rounded-xl mb-3"></div>

              {/* Actions Skeleton */}
              <div className="flex items-center gap-4 pt-3 border-t border-border-primary">
                <div className="h-4 bg-gray-700 rounded w-20"></div>
                <div className="h-4 bg-gray-700 rounded w-12"></div>
                <div className="h-4 bg-gray-700 rounded w-12"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
