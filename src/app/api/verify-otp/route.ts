import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateEmailMatchesRoll, validateMGITEmail } from '@/lib/emailValidation';

export async function POST(request: NextRequest) {
  try {
    const { email, otpCode, type } = await request.json();

    if (type !== 'email_verification' || typeof email !== 'string' || typeof otpCode !== 'string') {
      return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!validateMGITEmail(normalizedEmail) || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 401 });
    }

    const serverSupabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await serverSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please login to verify your email.' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('roll_number')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile?.roll_number || !validateEmailMatchesRoll(normalizedEmail, profile.roll_number)) {
      return NextResponse.json({ error: 'Email does not match your account.' }, { status: 400 });
    }

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('id, expires_at')
      .eq('email', normalizedEmail)
      .eq('code', otpCode)
      .eq('type', 'email_verification')
      .maybeSingle();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 401 });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      await supabaseAdmin.from('otp_codes').delete().eq('id', otpRecord.id);
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 401 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ college_email: normalizedEmail, is_email_verified: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Email verification profile update failed:', updateError.message);
      return NextResponse.json({ error: 'Failed to update email verification.' }, { status: 500 });
    }

    await supabaseAdmin.from('otp_codes').delete().eq('id', otpRecord.id);
    return NextResponse.json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error('Verify OTP API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}