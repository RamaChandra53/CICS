-- ============================================================
-- Migration: Lock down profiles RLS to prevent PII exposure
-- 
-- PROBLEM: The current profiles SELECT policy is `USING (true)`,
-- which means any authenticated user can query every user's
-- roll_number, email, college_email, etc.
--
-- SOLUTION: Create a profiles_public view with only safe columns
-- and update the RLS policy so users can only read their own
-- full profile. Other users' data goes through the view.
-- ============================================================

-- ── Step 1: Create a public-safe view ─────────────────────────
CREATE OR REPLACE VIEW profiles_public AS
SELECT
  id,
  pseudo_username,
  is_verified,
  is_email_verified,
  year,
  branch,
  real_display_name,
  full_name,
  show_roll_number_publicly,
  pseudo_username_status,
  created_at
FROM profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON profiles_public TO authenticated;
GRANT SELECT ON profiles_public TO anon;

-- ── Step 2: Update the profiles SELECT RLS policy ─────────────
-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "profiles_are_viewable_by_everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create new restrictive policy: users can only SELECT their own full profile
CREATE POLICY "Users can read own full profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ── Step 3: Allow service role to bypass (for admin operations) ──
-- The service role key already bypasses RLS by default in Supabase.
-- No additional policy needed.

-- ── Step 4: Create a policy for the profiles_public view ──────
-- Views inherit the RLS of the underlying table, so we need a
-- policy that allows reading the safe columns for all users.
-- We do this by creating a specific policy for authenticated users
-- to read limited data from profiles (for the view to work).

-- Actually, in Supabase, views run with the permissions of the
-- view owner (typically the postgres role), which bypasses RLS.
-- So profiles_public will work without additional RLS changes.
-- The key protection is that direct queries to the profiles table
-- will now only return the user's own row.

-- ============================================================
-- IMPORTANT: After running this migration, update all frontend
-- queries that join on profiles to only select safe columns,
-- or use profiles_public for cross-user queries.
-- ============================================================
