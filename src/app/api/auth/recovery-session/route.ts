import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const RECOVERY_COOKIE = 'cics-password-recovery';

async function getRecoveryUser() {
  const cookieStore = await cookies();
  const recoveryUserId = cookieStore.get(RECOVERY_COOKIE)?.value;
  if (!recoveryUserId) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== recoveryUserId) return null;
  return { supabase, cookieStore };
}

export async function GET() {
  const recovery = await getRecoveryUser();
  if (!recovery) return NextResponse.json({ error: 'Recovery session unavailable.' }, { status: 401 });
  return NextResponse.json({ ready: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const recovery = await getRecoveryUser();
  if (!recovery) return NextResponse.json({ error: 'Your reset link has expired. Request a new one.' }, { status: 401 });

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ error: 'Enter a valid new password.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
  }

  const { error } = await recovery.supabase.auth.updateUser({ password });
  if (error) {
    console.error('Recovered password update failed:', error.message);
    const message = error.message.toLowerCase().includes('different')
      ? 'Choose a password you have not used for this account before.'
      : 'We could not update your password. Please try again.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await recovery.supabase.auth.signOut({ scope: 'local' });
  recovery.cookieStore.delete(RECOVERY_COOKIE);
  return NextResponse.json({ success: true });
}
