'use client';

import { useEffect, useState } from 'react';

export type LinkPreviewMetadata = {
  title?: string;
  description?: string;
  image?: string;
};

export function useLinkPreview(url: string) {
  const [metadata, setMetadata] = useState<LinkPreviewMetadata | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setMetadata(null);

    const fetchMeta = async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (response.ok && !cancelled) {
          const data = (await response.json()) as LinkPreviewMetadata;
          setMetadata(data);
        }
      } catch {
        // Link previews are best-effort.
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    fetchMeta();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { metadata, loaded };
}
