export default function PostLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-5 h-6 w-24 animate-pulse rounded bg-gray-800" />
      <div className="mb-5 rounded-2xl border border-gray-800/60 bg-[#1a1a1a] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-800" />
          <div className="space-y-2">
            <div className="h-3 w-36 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-24 animate-pulse rounded bg-gray-900" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-800" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-800/60 bg-[#1a1a1a] p-4"
          >
            <div className="mb-2 h-3 w-40 animate-pulse rounded bg-gray-800" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
