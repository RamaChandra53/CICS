import { createClient } from '@/lib/supabase';

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP in database
export async function storeOTP(email: string, otp: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<void> {
  const supabase = createClient();
  
  console.log(`=== STORING OTP ===`);
  console.log(`Email: ${email}`);
  console.log(`OTP: ${otp}`);
  console.log(`Type: ${type}`);
  
  // Delete any existing OTPs for this email
  const { error: deleteError } = await supabase
    .from('otp_codes')
    .delete()
    .eq('email', email)
    .eq('type', type);
  
  console.log(`Deleted existing OTPs:`, { deleteError });
  
  // Store new OTP with 10-minute expiration
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  
  console.log(`Storing new OTP with expiration: ${expiresAt}`);
  
  const { error } = await supabase
    .from('otp_codes')
    .insert({
      email,
      code: otp,
      type,
      expires_at: expiresAt,
    });
  
  console.log(`OTP storage result:`, { error });
  
  if (error) {
    console.error('Error storing OTP:', error);
    throw new Error('Failed to store OTP code');
  }
}

// Verify OTP from database
export async function verifyOTP(email: string, otp: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<boolean> {
  const supabase = createClient();
  
  console.log(`=== VERIFYING OTP ===`);
  console.log(`Email: ${email}`);
  console.log(`OTP: ${otp}`);
  console.log(`Type: ${type}`);
  
  const { data, error } = await supabase
    .from('otp_codes')
    .select('id, expires_at')
    .eq('email', email)
    .eq('code', otp)
    .eq('type', type)
    .single();
  
  console.log(`Database query result:`, { data, error });
  
  if (error || !data) {
    console.log(`OTP verification failed: ${error?.message || 'No data found'}`);
    return false;
  }
  
  // Check if OTP has expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  console.log(`Checking expiration:`);
  console.log(`Current time: ${now.toISOString()}`);
  console.log(`OTP expires at: ${expiresAt.toISOString()}`);
  console.log(`Is expired: ${now > expiresAt}`);
  
  if (now > expiresAt) {
    console.log(`OTP expired, deleting...`);
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

// Send OTP via email (using a simple approach that doesn't send magic links)
export async function sendOTPEmail(email: string, otp: string, type: 'email_verification' | 'password_reset' = 'email_verification'): Promise<void> {
  const supabase = createClient();
  
  const subject = type === 'email_verification' 
    ? 'CICS - Email Verification Code' 
    : 'CICS - Password Reset Code';
  
  const message = type === 'email_verification'
    ? `Your CICS email verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    : `Your CICS password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;
  
  try {
    // For now, we'll use a simple console log approach
    // In production, you'd want to use a proper email service
    console.log(`=== OTP EMAIL ===`);
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log(`=== END OTP EMAIL ===`);
    
    // TODO: Implement proper email sending service
    // Options: SendGrid, Resend, AWS SES, or custom SMTP
    // For now, we'll just log it and return success
    
    // Store the OTP in the database (already done by caller)
    // The user can see the OTP in the console for testing
    
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
}
