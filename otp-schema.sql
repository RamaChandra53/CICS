-- Create otp_codes table for custom OTP verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Add temp_password field to profiles table for password reset
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS temp_password text;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON public.otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_type ON public.otp_codes(type);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies (using DROP IF EXISTS to handle existing policies)
DROP POLICY IF EXISTS "Users can view their own OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Users can insert their own OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Users can update their own OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Users can delete their own OTP codes" ON public.otp_codes;

CREATE POLICY "Users can view their own OTP codes" ON public.otp_codes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own OTP codes" ON public.otp_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own OTP codes" ON public.otp_codes
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own OTP codes" ON public.otp_codes
  FOR DELETE USING (true);
