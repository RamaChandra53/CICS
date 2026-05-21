import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    );
  }

  try {
    // Fetch the HTML content of the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse HTML to extract metadata
    const metadata = extractMetadata(html, url);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Link preview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link metadata' },
      { status: 500 }
    );
  }
}

function getMetaContent(html: string, nameOrProperty: string): string {
  // Match <meta property="X" content="Y"> or <meta name="X" content="Y">
  // Also handles content before property/name attribute
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProperty}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${nameOrProperty}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
}

function extractMetadata(html: string, url: string) {
  // Extract title from <title> tag
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

  // Get domain from URL
  const domain = new URL(url).hostname;

  return {
    title: title.trim(),
    description: description.trim(),
    image: image.trim(),
    siteName: siteName.trim() || domain,
    url: url,
    domain: domain,
  };
}
