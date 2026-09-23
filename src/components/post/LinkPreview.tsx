'use client';

import { useLinkPreview } from '@/hooks/useLinkPreview';

export default function LinkPreview({ url }: { url: string }) {
  const { metadata, loaded } = useLinkPreview(url);

  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="mt-3 block overflow-hidden rounded-2xl border border-[#252a31] hover:border-[#353a41] transition-colors"
    >
      {metadata?.image && (
        <div className="max-h-48 overflow-hidden">
          <img src={metadata.image} alt="" className="w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <p className="text-xs text-indigo-400 mb-1 truncate">{domain}</p>
        {metadata?.title && (
          <p className="text-sm font-medium text-slate-200 line-clamp-2">{metadata.title}</p>
        )}
        {metadata?.description && (
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{metadata.description}</p>
        )}
        {!metadata?.title && !loaded && (
          <div className="animate-pulse">
            <div className="h-3 bg-[#1f2329] rounded w-2/3 mb-1" />
            <div className="h-3 bg-[#1f2329] rounded w-full" />
          </div>
        )}
        {!metadata?.title && loaded && (
          <p className="text-sm text-slate-300 truncate">{url}</p>
        )}
      </div>
    </a>
  );
}
