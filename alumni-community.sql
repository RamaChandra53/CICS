-- Alumni Community Setup
-- Run this SQL in your Supabase SQL editor

-- Create alumni community if it doesn't exist
INSERT INTO communities (name, slug, description, icon, type, member_count) VALUES
('Alumni', 'alumni', 'For MGIT graduates and alumni', '🎓', 'auto', 0)
ON CONFLICT (slug) DO NOTHING;

-- Update existing alumni profiles (those with year calculation that returns 'Alumni')
-- This will be handled dynamically by the login flow, but here's a reference query:
-- UPDATE profiles SET year = NULL, section = NULL WHERE roll_number LIKE '22%' OR roll_number LIKE '21%' OR roll_number LIKE '20%';

-- Add comment for documentation
COMMENT ON COLUMN profiles.year IS 'Current academic year (1st, 2nd, 3rd, 4th) or NULL for alumni';
