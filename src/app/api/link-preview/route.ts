import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rate-limiter';
import { validateLinkPreviewUrl } from '@/lib/linkPreviewSecurity';

/**
 * GET /api/link-preview?url=<url>
 *
 * Fetches Open Graph / meta-tag metadata from an external URL for link preview cards.
 *
 * Security hardening:
 *  - SSRF protection: blocks private/reserved IP ranges, localhost, and metadata endpoints
 *  - Only http/https schemes are allowed
 *  - 5-second fetch timeout
 *  - Response body capped at 1 MB
 *  - Rate limited: 30 requests per minute per IP
 */

// ── Module-level rate limiter (persists across requests in the same process) ──
const limiter = new RateLimiter({ windowMs: 60_000, max: 30 });

export async function GET(request: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rateResult = limiter.check(ip);

  const rateLimitHeaders = {
    'X-RateLimit-Limit': rateResult.limit.toString(),
    'X-RateLimit-Remaining': rateResult.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateResult.resetAt / 1000).toString(),
  };

  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  // ── Parse + validate URL parameter ──────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json(
      { error: 'url parameter is required.' },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format.' },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // ── SSRF check ───────────────────────────────────────────────────────────────
  const ssrfCheck = await validateLinkPreviewUrl(parsedUrl);
  if (!ssrfCheck.allowed) {
    return NextResponse.json(
      { error: ssrfCheck.reason },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // ── Fetch with timeout + body size cap ──────────────────────────────────────
  const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB
  const FETCH_TIMEOUT_MS = 5000; // 5 seconds

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CICSLinkPreviewBot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server returned ${response.status}.` },
        { status: 502, headers: rateLimitHeaders }
      );
    }

    // Cap response body size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Response too large.' },
        { status: 422, headers: rateLimitHeaders }
      );
    }

    // Stream and limit body
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: 'Failed to read response.' },
        { status: 502, headers: rateLimitHeaders }
      );
    }

    let bytesRead = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        reader.cancel();
        break; // Process what we have so far — enough for meta tags
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array(0))
    );

    const metadata = extractMetadata(html, rawUrl);

    return NextResponse.json(metadata, { headers: rateLimitHeaders });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out.' },
        { status: 504, headers: rateLimitHeaders }
      );
    }
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link metadata.' },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

// ── Metadata extraction helpers ───────────────────────────────────────────────

function getMetaContent(html: string, nameOrProperty: string): string {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

function extractMetadata(html: string, url: string) {
  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleTagContent = titleTagMatch?.[1] ?? '';

  const title =
    getMetaContent(html, 'og:title') ||
    getMetaContent(html, 'title') ||
    titleTagContent ||
    '';

  const description =
    getMetaContent(html, 'og:description') ||
    getMetaContent(html, 'description') ||
    '';

  const image =
    getMetaContent(html, 'og:image') ||
    getMetaContent(html, 'image') ||
    '';

  const siteName =
    getMetaContent(html, 'og:site_name') ||
    getMetaContent(html, 'site_name') ||
    '';

  const domain = new URL(url).hostname;

  return {
    title: title.trim().substring(0, 300),
    description: description.trim().substring(0, 500),
    image: image.trim().substring(0, 1000),
    siteName: (siteName.trim() || domain).substring(0, 100),
    url,
    domain,
  };
}
