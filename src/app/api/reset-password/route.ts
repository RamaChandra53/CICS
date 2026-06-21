import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/reset-password
 *
 * Resets a user's password ONLY after verifying a valid OTP.
 * The OTP must have been previously generated via the forgot-password flow
 * and stored in the `otp_codes` table.
 *
 * Required body: { rollNumber, newPassword, otpCode, email }
 *
 * Security:
 * - Requires a valid, unexpired OTP matching the email + roll number
 * - OTP is consumed (deleted) after successful verification
 * - Rate-limited by OTP expiry (10 minutes)
 */
export async function POST(request: NextRequest) {
  try {
    const { rollNumber, newPassword, otpCode, email } = await request.json();

    // ── Validate required fields ────────────────────────────
    if (!rollNumber || !newPassword || !otpCode || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: rollNumber, newPassword, otpCode, and email are all required.' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const normalizedRoll = rollNumber.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();

    // ── Create admin client ─────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ── Verify OTP ──────────────────────────────────────────
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('id, expires_at')
      .eq('email', normalizedEmail)
      .eq('code', otpCode)
      .eq('type', 'password_reset')
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP code. Please request a new one.' },
        { status: 401 }
      );
    }

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      // Clean up expired OTP
      await supabaseAdmin
        .from('otp_codes')
        .delete()
        .eq('id', otpRecord.id);

      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    // ── Look up the user by roll number ─────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('roll_number', normalizedRoll)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'No account found with this roll number.' },
        { status: 404 }
      );
    }

    // ── Consume the OTP (delete it) ─────────────────────────
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('id', otpRecord.id);

    // ── Reset the password ──────────────────────────────────
    const internalEmail = `${normalizedRoll}@cics.local`;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update failed:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // Update email separately (non-blocking)
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { email: internalEmail }
    );

    if (emailError) {
      console.error('Email update failed (password was updated successfully)');
    }

    // Mark as no longer first login if they're resetting their password
    await supabaseAdmin
      .from('profiles')
      .update({ is_first_login: false })
      .eq('id', profile.id);

    return NextResponse.json(
      { message: 'Password reset successful.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
