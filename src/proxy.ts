import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware — Server-side route protection
 *
 * Runs BEFORE the page is rendered. Redirects unauthenticated users
 * away from protected routes. This supplements (does not replace)
 * the client-side auth checks in (app)/layout.tsx.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Can't verify auth without Supabase config — let the page handle it
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Set cookies on the request for downstream use
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Re-create response with updated request cookies
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        // Set cookies on the response for the browser
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session (important: this also refreshes expired tokens)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && pathname !== '/suspended') {
    const { data: suspension } = await supabase
      .from('moderation_suspensions')
      .select('kind, reason, ends_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .maybeSingle();

    if (suspension) {
      const suspendedUrl = request.nextUrl.clone();
      suspendedUrl.pathname = '/suspended';
      suspendedUrl.searchParams.set('kind', suspension.kind);
      return NextResponse.redirect(suspendedUrl);
    }
  }

  // ── Protected routes: require authentication ──────────────
  const isProtectedRoute =
    pathname.startsWith('/feed') ||
    pathname.startsWith('/post') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/room') ||
    pathname.startsWith('/communities') ||
    pathname.startsWith('/admin');

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Auth pages: redirect to /feed if already logged in ────
  const isAuthPage =
    pathname === '/' ||
    pathname === '/set-password' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  if (isAuthPage && user && pathname === '/') {
    // Check if first login — but only redirect from the login page
    // Don't redirect from set-password (user needs to set password)
    const feedUrl = request.nextUrl.clone();
    feedUrl.pathname = '/feed';
    return NextResponse.redirect(feedUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)',
  ],
};
