import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f12] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Big 404 */}
        <div className="mb-6">
          <span className="text-8xl font-bold bg-gradient-to-br from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            404
          </span>
        </div>

        {/* Message */}
        <h1 className="text-xl font-semibold text-white mb-2">Page not found</h1>
        <p className="text-sm text-slate-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/feed"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Go to Feed
          </Link>
          <Link
            href="/communities"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#252a31] px-6 text-sm font-medium text-slate-300 transition-colors hover:border-indigo-500/40 hover:text-white"
          >
            Browse Communities
          </Link>
        </div>
      </div>
    </div>
  );
}
