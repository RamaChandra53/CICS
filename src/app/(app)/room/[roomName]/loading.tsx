export default function RoomLoading() {
  return (
    <div className="min-h-screen bg-bg-primary gradient-bg">
      <div className="mx-auto max-w-[740px] px-4 py-6">
        <div className="mb-6 h-24 animate-pulse rounded-2xl border border-border-primary bg-bg-secondary/40" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-border-primary bg-bg-secondary/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
