import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const RECOVERY_COOKIE = 'cics-password-recovery';

function safeNextPath(value: string | null, fallback: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');
  const isRecovery = type === 'recovery';
  const nextPath = safeNextPath(url.searchParams.get('next'), isRecovery ? '/reset-password' : '/feed');

  if (!code || url.searchParams.get('error')) {
    const destination = new URL(isRecovery ? '/reset-password' : '/', url.origin);
    if (isRecovery) destination.searchParams.set('error', 'invalid_link');
    return NextResponse.redirect(destination);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    console.error('Authentication callback failed:', error?.message || 'No session created');
    const destination = new URL(isRecovery ? '/reset-password' : '/', url.origin);
    if (isRecovery) destination.searchParams.set('error', 'invalid_link');
    return NextResponse.redirect(destination);
  }

  if (isRecovery) {
    const destination = new URL(nextPath, url.origin);
    destination.searchParams.set('recovery', '1');
    const response = NextResponse.redirect(destination);
    response.cookies.set(RECOVERY_COOKIE, data.session.user.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60,
    });
    return response;
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
