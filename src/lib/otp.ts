import { createClient } from '@/lib/supabase';

// Generate a 6-digit OTP using cryptographically secure random numbers
export function generateOTP(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  // Ensure 6 digits by taking modulo and adding offset
  const otp = (buffer[0] % 900000) + 100000;
  return otp.toString();
}

// Store OTP in database
export async function storeOTP(email: string, otp: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<void> {
  const supabase = createClient();
  
  // Delete any existing OTPs for this email
  await supabase
    .from('otp_codes')
    .delete()
    .eq('email', email)
    .eq('type', type);
  
  // Store new OTP with 10-minute expiration
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  const { error } = await supabase
    .from('otp_codes')
    .insert({
      email,
      code: otp,
      type,
      expires_at: expiresAt,
    });
  
  if (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP code');
  }
}

// Verify OTP from database
export async function verifyOTP(email: string, otp: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('otp_codes')
    .select('id, expires_at')
    .eq('email', email)
    .eq('code', otp)
    .eq('type', type)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  // Check if OTP has expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  if (now > expiresAt) {
    // Delete expired OTP
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', email)
      .eq('code', otp);
    return false;
  }
  
  // Delete used OTP
  await supabase
    .from('otp_codes')
    .delete()
    .eq('email', email)
    .eq('code', otp);
  
  return true;
}

// Send OTP via email
export async function sendOTPEmail(email: string, otp: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<void> {
  try {
    // TODO: Implement proper email sending service
    // Options: SendGrid, Resend, AWS SES, or custom SMTP
    // For now, log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}
