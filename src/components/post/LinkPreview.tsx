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
      className="mt-3 block overflow-hidden rounded-xl border border-border-primary bg-bg-secondary transition-colors hover:border-border-secondary"
    >
      {metadata?.image && (
        <div className="max-h-48 overflow-hidden">
          <img src={metadata.image} alt="" className="w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <p className="mb-1 truncate text-xs text-text-accent">{domain}</p>
        {metadata?.title && (
          <p className="line-clamp-2 text-sm font-medium text-text-primary">{metadata.title}</p>
        )}
        {metadata?.description && (
          <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{metadata.description}</p>
        )}
        {!metadata?.title && !loaded && (
          <div className="animate-pulse">
            <div className="mb-1 h-3 w-2/3 rounded bg-bg-tertiary" />
            <div className="h-3 w-full rounded bg-bg-tertiary" />
          </div>
        )}
        {!metadata?.title && loaded && (
          <p className="truncate text-sm text-text-primary">{url}</p>
        )}
      </div>
    </a>
  );
}
