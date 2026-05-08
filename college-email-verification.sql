-- MGIT College Email Verification Schema Update
-- Run this SQL in your Supabase SQL editor

-- Add college email verification columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS college_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS profiles_college_email_idx ON profiles(college_email);
CREATE INDEX IF NOT EXISTS profiles_is_email_verified_idx ON profiles(is_email_verified);

-- Update existing profiles to ensure is_email_verified is set correctly
UPDATE profiles 
SET is_email_verified = FALSE 
WHERE is_email_verified IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.college_email IS 'MGIT college email address for anonymous posting verification (@mgit.ac.in)';
COMMENT ON COLUMN profiles.is_email_verified IS 'Whether the college email has been verified via OTP';
