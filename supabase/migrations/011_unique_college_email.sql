-- Enforce one CICS profile per MGIT college email, irrespective of case.
-- Supabase Auth also enforces unique auth emails; this protects the profile
-- record and accounts created through older flows.

CREATE UNIQUE INDEX IF NOT EXISTS profiles_college_email_unique_idx
  ON profiles (LOWER(college_email))
  WHERE college_email IS NOT NULL;
