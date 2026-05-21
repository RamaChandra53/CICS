-- Soft verification model for CICS / Anonstud

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS college_email TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

UPDATE profiles
SET is_email_verified = FALSE
WHERE is_email_verified IS NULL;

CREATE INDEX IF NOT EXISTS profiles_college_email_idx
ON profiles(college_email);

CREATE INDEX IF NOT EXISTS profiles_is_email_verified_idx
ON profiles(is_email_verified);

COMMENT ON COLUMN profiles.college_email IS
'Verified MGIT college email used for optional trust upgrades.';

COMMENT ON COLUMN profiles.is_email_verified IS
'Whether the user verified their MGIT college email.';
