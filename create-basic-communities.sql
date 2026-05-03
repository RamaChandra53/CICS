-- Create Basic Communities for Testing
-- Run this in your Supabase SQL editor

-- Basic communities that should exist
INSERT INTO communities (name, slug, description, icon, type) VALUES
('Campus', 'campus', 'College-wide feed for everyone', '🏫', 'auto'),
('Confessions', 'confessions', 'Anonymous only. No identity shown.', '🎭', 'open'),
('Rants', 'rants', 'Vent freely', '😤', 'open'),
('Placements', 'placements', 'Internships, PPOs, interview experiences', '💼', 'open'),
('Exams', 'exams', 'PYQs, study material, timetables', '📝', 'open'),
('Hostel Life', 'hostellife', 'Hostel students only', '🏠', 'open'),
('Lost & Found', 'lostfound', 'Lost something? Found something?', '🔍', 'open'),
('Rent a Thing', 'rentathing', 'Borrow/rent from classmates', '🤝', 'open'),
('Notes', 'notes', 'Share notes and study material', '📚', 'open'),
('College Changes', 'collegechanges', 'Complaints and suggestions', '📢', 'open'),
('Clubs', 'clubs', 'College clubs and events', '🎯', 'open')
ON CONFLICT (slug) DO NOTHING;

-- Add RLS policies for community_members if they don't exist
DROP POLICY IF EXISTS "Community members are viewable by authenticated users" ON community_members;
DROP POLICY IF EXISTS "Authenticated users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave their own community memberships" ON community_members;

CREATE POLICY "Community members are viewable by authenticated users" ON community_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can join communities" ON community_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can leave their own community memberships" ON community_members
  FOR DELETE USING (auth.uid() = user_id);

-- Verify communities were created
SELECT name, slug, type, member_count FROM communities ORDER BY slug;
