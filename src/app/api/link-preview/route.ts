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

function extractMetadata(html: string, url: string) {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Helper function to get content from meta tags
  const getMetaContent = (name: string, property?: string) => {
    // Try property first (for Open Graph)
    if (property) {
      const meta = tempDiv.querySelector(`meta[property="${property}"]`) ||
                   tempDiv.querySelector(`meta[name="${property}"]`);
      if (meta) return meta.getAttribute('content');
    }
    
    // Try name
    const meta = tempDiv.querySelector(`meta[name="${name}"]`) ||
                 tempDiv.querySelector(`meta[property="${name}"]`);
    return meta?.getAttribute('content');
  };

  // Extract metadata
  const title = 
    getMetaContent('', 'og:title') ||
    getMetaContent('title') ||
    tempDiv.querySelector('title')?.textContent ||
    '';

  const description = 
    getMetaContent('', 'og:description') ||
    getMetaContent('description') ||
    '';

  const image = 
    getMetaContent('', 'og:image') ||
    getMetaContent('image') ||
    '';

  const siteName = 
    getMetaContent('', 'og:site_name') ||
    getMetaContent('site_name') ||
    '';

  // Get domain from URL
  const domain = new URL(url).hostname;

  return {
    title: title.trim(),
    description: description.trim(),
    image: image.trim(),
    siteName: siteName.trim() || domain,
    url: url,
    domain: domain
  };
}
