export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-5 md:px-6 md:py-8">
      <div className="mb-5 h-32 animate-pulse rounded-3xl border border-[#252a31] bg-[#15181c]" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border border-[#252a31] bg-[#15181c]"
          />
        ))}
      </div>
    </div>
  );
}
