import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, getClientIp } from '@/lib/rate-limiter';

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

// ── SSRF: private / reserved IPv4 ranges ──────────────────────────────────────
const PRIVATE_IPV4_PATTERNS = [
  /^127\./,              // Loopback
  /^0\./,               // This network
  /^10\./,              // RFC 1918 private
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC 1918 private
  /^192\.168\./,        // RFC 1918 private
  /^169\.254\./,        // Link-local / AWS metadata (169.254.169.254)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // Shared address (RFC 6598)
  /^192\.0\.[02]\./,    // IETF protocol assignments
  /^198\.51\.100\./,    // TEST-NET-2 (RFC 5737)
  /^203\.0\.113\./,     // TEST-NET-3 (RFC 5737)
  /^240\./,             // Reserved (class E)
  /^255\.255\.255\.255$/, // Broadcast
];

// ── SSRF: blocked hostnames ───────────────────────────────────────────────────
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',  // GCP metadata
  'metadata',
  '0.0.0.0',
]);

function isSsrfUrl(parsedUrl: URL): { blocked: boolean; reason?: string } {
  const { protocol, hostname } = parsedUrl;

  // Only allow http and https
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { blocked: true, reason: 'Only http and https URLs are supported.' };
  }

  // Block by hostname
  const lowerHost = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lowerHost)) {
    return { blocked: true, reason: 'URL is not allowed.' };
  }

  // Block IPv4 private ranges
  for (const pattern of PRIVATE_IPV4_PATTERNS) {
    if (pattern.test(hostname)) {
      return { blocked: true, reason: 'URL is not allowed.' };
    }
  }

  // Block IPv6 loopback and link-local
  // [::1], [fe80::...], [fc00::...], [fd00::...]
  const ipv6 = hostname.startsWith('[') ? hostname.slice(1, -1) : null;
  if (ipv6) {
    const lower = ipv6.toLowerCase();
    if (
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd')
    ) {
      return { blocked: true, reason: 'URL is not allowed.' };
    }
  }

  return { blocked: false };
}

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
  const ssrfCheck = isSsrfUrl(parsedUrl);
  if (ssrfCheck.blocked) {
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
