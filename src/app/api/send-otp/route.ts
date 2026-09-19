import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOtpEmail } from '@/lib/email';

/**
 * POST /api/send-otp
 *
 * Server-side OTP generation, storage, and email delivery.
 * Keeps all secrets (RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY) server-side.
 *
 * Body: { email: string, type: 'password_reset' | 'email_verification' }
 *
 * Rate limit: max 1 OTP request per email per 60 seconds (enforced via DB check).
 */
export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    // ── Validate inputs ─────────────────────────────────────
    if (!email || !type) {
      return NextResponse.json(
        { error: 'email and type are required.' },
        { status: 400 }
      );
    }

    if (!['password_reset', 'email_verification'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be password_reset or email_verification.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      );
    }

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
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Rate limit: check for recent OTP (created < 60s ago) ─
    const { data: recentOtp } = await supabaseAdmin
      .from('otp_codes')
      .select('created_at')
      .eq('email', normalizedEmail)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtp) {
      const createdAt = new Date(recentOtp.created_at).getTime();
      const secondsAgo = (Date.now() - createdAt) / 1000;
      if (secondsAgo < 60) {
        const waitSeconds = Math.ceil(60 - secondsAgo);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` },
          { status: 429 }
        );
      }
    }

    // ── Generate OTP ────────────────────────────────────────
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const otp = ((buffer[0] % 900000) + 100000).toString();

    // ── Delete old OTPs for this email+type ─────────────────
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('email', normalizedEmail)
      .eq('type', type);

    // ── Store new OTP (10-minute expiry) ────────────────────
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabaseAdmin
      .from('otp_codes')
      .insert({ email: normalizedEmail, code: otp, type, expires_at: expiresAt });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate OTP. Please try again.' },
        { status: 500 }
      );
    }

    // ── Send email via configured provider (SMTP / Resend / Dev log) ──
    const emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      type,
    });

    if (!emailResult.success) {
      console.error('Send OTP delivery error:', emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    const responseMessage = emailResult.devMode
      ? 'OTP generated (check server terminal logs in dev mode).'
      : 'Verification code sent to your email.';

    return NextResponse.json({ message: responseMessage, devMode: emailResult.devMode });

  } catch (error) {
    console.error('Send OTP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
