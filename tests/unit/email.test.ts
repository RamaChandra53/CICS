import { test, expect } from '@playwright/test';
import { sendOtpEmail } from '@/lib/email';

test.describe('sendOtpEmail service', () => {
  test('returns devMode: true in development when no transport credentials configured', async () => {
    const env = process.env as Record<string, string | undefined>;
    const origSmtpUser = env.SMTP_USER;
    const origSmtpPass = env.SMTP_PASS;
    const origResendKey = env.RESEND_API_KEY;
    const origNodeEnv = env.NODE_ENV;

    delete env.SMTP_USER;
    delete env.SMTP_PASS;
    delete env.RESEND_API_KEY;
    env.NODE_ENV = 'development';

    try {
      const result = await sendOtpEmail({
        to: 'test240501@mgit.ac.in',
        otp: '123456',
        type: 'email_verification',
      });

      expect(result.success).toBe(true);
      expect(result.devMode).toBe(true);
    } finally {
      env.SMTP_USER = origSmtpUser;
      env.SMTP_PASS = origSmtpPass;
      env.RESEND_API_KEY = origResendKey;
      env.NODE_ENV = origNodeEnv;
    }
  });

  test('normalizes email address before processing', async () => {
    const env = process.env as Record<string, string | undefined>;
    const origSmtpUser = env.SMTP_USER;
    const origSmtpPass = env.SMTP_PASS;
    const origResendKey = env.RESEND_API_KEY;
    const origNodeEnv = env.NODE_ENV;

    delete env.SMTP_USER;
    delete env.SMTP_PASS;
    delete env.RESEND_API_KEY;
    env.NODE_ENV = 'development';

    try {
      const result = await sendOtpEmail({
        to: '  Student240501@MGIT.AC.IN  ',
        otp: '654321',
        type: 'password_reset',
      });

      expect(result.success).toBe(true);
      expect(result.devMode).toBe(true);
    } finally {
      env.SMTP_USER = origSmtpUser;
      env.SMTP_PASS = origSmtpPass;
      env.RESEND_API_KEY = origResendKey;
      env.NODE_ENV = origNodeEnv;
    }
  });
});
