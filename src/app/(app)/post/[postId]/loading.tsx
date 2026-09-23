export default function PostLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 md:px-6 md:py-6">
      <div className="mb-5 h-6 w-24 animate-pulse rounded bg-[#1f2329]" />
      <div className="mb-5 rounded-2xl border border-[#252a31] bg-[#15181c] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-[#1f2329]" />
          <div className="space-y-2">
            <div className="h-3 w-36 animate-pulse rounded bg-[#1f2329]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[#0f1318]" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-[#1f2329]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[#1f2329]" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#252a31] bg-[#15181c] p-4"
          >
            <div className="mb-2 h-3 w-40 animate-pulse rounded bg-[#1f2329]" />
            <div className="h-3 w-full animate-pulse rounded bg-[#0f1318]" />
          </div>
        ))}
      </div>
    </div>
  );
}
