import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { validateMGITEmail } from '@/lib/emailValidation';

type OtpRecord = {
  id: string;
  email: string;
  code: string;
  expires_at: string;
};

export async function POST(request: NextRequest) {
  try {
    const { email, otpCode, password } = await request.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const code = typeof otpCode === 'string' ? otpCode.trim() : '';

    if (!validateMGITEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Enter a valid MGIT college email address.' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter the 6-digit reset code.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('id, email, code, expires_at')
      .eq('email', normalizedEmail)
      .eq('code', code)
      .eq('type', 'password_reset')
      .maybeSingle<OtpRecord>();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'Invalid reset code.' }, { status: 400 });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      await supabaseAdmin.from('otp_codes').delete().eq('id', otpRecord.id);
      return NextResponse.json({ error: 'This reset code has expired. Request a new one.' }, { status: 410 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('college_email', normalizedEmail)
      .maybeSingle<{ id: string }>();

    if (profileError) {
      console.error('Password reset profile lookup error:', profileError.message);
      return NextResponse.json({ error: 'We could not reset your password right now.' }, { status: 500 });
    }

    if (!profile) {
      await supabaseAdmin.from('otp_codes').delete().eq('id', otpRecord.id);
      return NextResponse.json({ error: 'Invalid reset code.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password,
    });

    if (updateError) {
      console.error('Password reset update error:', updateError.message);
      return NextResponse.json({ error: 'We could not reset your password right now.' }, { status: 500 });
    }

    await supabaseAdmin.from('otp_codes').delete().eq('id', otpRecord.id);

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Password reset API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
