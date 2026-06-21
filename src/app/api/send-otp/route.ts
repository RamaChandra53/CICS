import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // ── Send email via Resend ───────────────────────────────
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      // In development: log OTP to console instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP for ${normalizedEmail} (${type}): ${otp}`);
        return NextResponse.json({ message: 'OTP generated (check server logs in dev).' });
      }
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured.' },
        { status: 500 }
      );
    }

    const subject =
      type === 'password_reset'
        ? 'CICS — Your Password Reset OTP'
        : 'CICS — Verify Your College Email';

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f1318; color: #e2e8f0; border-radius: 12px;">
        <h2 style="color: #a5b4fc; margin-bottom: 8px;">CICS</h2>
        <p style="color: #94a3b8; margin-bottom: 24px; font-size: 14px;">
          ${type === 'password_reset'
            ? 'You requested a password reset. Use the OTP below:'
            : 'Use the OTP below to verify your MGIT college email:'}
        </p>
        <div style="background: #1a1e24; border: 1px solid #252a31; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #a5b4fc;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        <p style="color: #475569; font-size: 11px; margin-top: 16px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CICS <noreply@cics.app>',
        to: [normalizedEmail],
        subject,
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Resend API error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Send OTP API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
