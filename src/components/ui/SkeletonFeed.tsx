'use client';

interface SkeletonFeedProps {
  count?: number;
}

export default function SkeletonFeed({ count = 5 }: SkeletonFeedProps) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border-primary bg-bg-card animate-pulse">
          <div className="flex">
            {/* Vote Column Skeleton */}
            <div className="w-12 bg-bg-secondary/50 flex flex-col items-center py-3 border-r border-border-primary">
              <div className="mb-2 h-6 w-6 rounded bg-bg-tertiary"></div>
              <div className="h-6 w-6 rounded bg-bg-tertiary"></div>
            </div>

            {/* Content Column Skeleton */}
            <div className="flex-1 p-4">
              {/* Meta Info Skeleton */}
              <div className="flex items-center text-xs mb-2">
                <div className="mr-2 h-4 w-20 rounded bg-bg-tertiary"></div>
                <div className="mr-2 h-4 w-24 rounded bg-bg-tertiary"></div>
                <div className="h-4 w-16 rounded bg-bg-tertiary"></div>
              </div>

              {/* Title Skeleton */}
              <div className="mb-2 h-6 w-full rounded bg-bg-tertiary"></div>
              <div className="mb-3 h-6 w-3/4 rounded bg-bg-tertiary"></div>

              {/* Body Preview Skeleton */}
              <div className="mb-1 h-4 w-full rounded bg-bg-tertiary"></div>
              <div className="mb-1 h-4 w-5/6 rounded bg-bg-tertiary"></div>
              <div className="mb-3 h-4 w-2/3 rounded bg-bg-tertiary"></div>

              {/* Image Skeleton */}
              <div className="mb-3 h-48 rounded-xl bg-bg-tertiary"></div>

              {/* Actions Skeleton */}
              <div className="flex items-center gap-4 pt-3 border-t border-border-primary">
                <div className="h-4 w-20 rounded bg-bg-tertiary"></div>
                <div className="h-4 w-12 rounded bg-bg-tertiary"></div>
                <div className="h-4 w-12 rounded bg-bg-tertiary"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
