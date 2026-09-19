import nodemailer from 'nodemailer';

interface SendOtpEmailOptions {
  to: string;
  otp: string;
  type: 'email_verification' | 'password_reset';
}

interface SendEmailResult {
  success: boolean;
  error?: string;
  devMode?: boolean;
}

/**
 * Builds the responsive HTML template for CICS verification emails
 */
function buildOtpEmailHtml(otp: string, type: 'email_verification' | 'password_reset'): string {
  const isVerification = type === 'email_verification';
  const title = isVerification ? 'MGIT Student Verification' : 'Password Reset Request';
  const description = isVerification
    ? 'Use the 6-digit verification code below to confirm your MGIT student status on CICS:'
    : 'We received a request to reset your CICS account password. Use the verification code below:';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f14; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #121820; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #1e293b;">
              <div style="display: inline-block; padding: 8px 16px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px;">
                <span style="font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #818cf8; text-transform: uppercase;">CICS • MGIT</span>
              </div>
              <h1 style="margin: 16px 0 0 0; font-size: 22px; font-weight: 700; color: #f8fafc;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8; text-align: center;">
                ${description}
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #0b0f14; border: 2px dashed #334155; border-radius: 12px; padding: 24px;">
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #60a5fa; text-align: center;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background-color: rgba(234, 179, 8, 0.1); border-left: 4px solid #eab308; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #fde047; line-height: 1.4;">
                  ⏱ This code expires in <strong>10 minutes</strong>. Never share this code with anyone.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                If you did not request this verification on CICS, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0a0d12; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                MGIT College Anonymous Forum &amp; Community Network (CICS)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends OTP email using the configured email service:
 * 1. SMTP (e.g. Gmail App Password, Brevo, SendGrid, custom SMTP) if SMTP_USER + SMTP_PASS are set.
 * 2. Resend API if RESEND_API_KEY is set.
 * 3. Fallback in development: logs code to console.
 */
export async function sendOtpEmail({ to, otp, type }: SendOtpEmailOptions): Promise<SendEmailResult> {
  const normalizedEmail = to.trim().toLowerCase();
  const isVerification = type === 'email_verification';
  const subject = isVerification
    ? `CICS Verification Code: ${otp}`
    : `CICS Password Reset Code: ${otp}`;

  const html = buildOtpEmailHtml(otp, type);
  const text = `${isVerification ? 'Your CICS verification code is:' : 'Your CICS password reset code is:'} ${otp}\n\nThis code expires in 10 minutes.\nIf you did not request this code, ignore this email.`;

  // 1. Check for SMTP credentials
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT) || (host === 'smtp.gmail.com' ? 465 : 587);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      const from = process.env.EMAIL_FROM || `CICS <${smtpUser}>`;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from,
        to: normalizedEmail,
        subject,
        text,
        html,
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('SMTP email error:', msg);
      return {
        success: false,
        error: `Failed to send email via SMTP: ${msg}`,
      };
    }
  }

  // 2. Check for Resend API key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const from = process.env.EMAIL_FROM || 'CICS <noreply@cics.app>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [normalizedEmail],
          subject,
          html,
          text,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Resend API error:', errorText);
        return {
          success: false,
          error: `Resend error: ${errorText}`,
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Resend email error:', msg);
      return {
        success: false,
        error: `Failed to send email via Resend: ${msg}`,
      };
    }
  }

  // 3. Neither configured: Dev mode fallback
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n========================================`);
    console.log(`[CICS DEV EMAIL SERVICE]`);
    console.log(`To: ${normalizedEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Notice: To receive real emails in your inbox, set SMTP_USER and SMTP_PASS in .env.local.`);
    console.log(`========================================\n`);

    return {
      success: true,
      devMode: true,
    };
  }

  return {
    success: false,
    error: 'Email service is not configured on the server. Please configure SMTP_USER and SMTP_PASS in environment variables.',
  };
}
