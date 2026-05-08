export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary gradient-bg">
      <div className="mx-auto max-w-[740px] px-4 py-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-xl border border-border-primary bg-bg-secondary/40 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
