export default function RoomLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 md:px-6 md:py-6">
      <div className="mb-4 h-28 animate-pulse rounded-2xl border border-[#252a31] bg-[#15181c]" />
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
