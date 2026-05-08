-- Reddit-Style Hybrid Community System Migration
-- Run this SQL in your Supabase SQL editor

-- Step 1: Remove unnecessary communities (keep only 5 core subreddits)
DELETE FROM community_members 
WHERE community_slug IN (
    'rants', 'exams', 'hostellife', 'lostfound', 'rentathing', 
    'notes', 'collegechanges', 'clubs'
);

DELETE FROM communities 
WHERE slug IN (
    'rants', 'exams', 'hostellife', 'lostfound', 'rentathing', 
    'notes', 'collegechanges'
);

-- Step 2: Keep only 5 core subreddits and ensure they exist
INSERT INTO communities (name, slug, description, icon, type, member_count) VALUES
('Campus', 'campus', 'Main feed for everyone', '🏫', 'auto', 0),
('Confessions', 'confessions', 'Anonymous only. No identity shown.', '🎭', 'open', 0),
('Placements', 'placements', 'Internships, PPOs, interview experiences', '💼', 'open', 0),
('Clubs', 'clubs', 'College clubs and events', '🎯', 'open', 0),
('Alumni', 'alumni', 'For MGIT graduates and alumni', '🎓', 'auto', 0)
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Enhanced tags system - Create predefined tags table
CREATE TABLE IF NOT EXISTS predefined_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert predefined tags organized by category
INSERT INTO predefined_tags (name, category, description) VALUES
-- Academic tags
('exams', 'academic', 'Exam related discussions and materials'),
('notes', 'academic', 'Study notes and materials'),
('study-material', 'academic', 'Study resources and references'),
('assignments', 'academic', 'Assignment help and discussions'),
('lab-reports', 'academic', 'Lab work and reports'),
('projects', 'academic', 'Project work and collaborations'),

-- College life tags
('hostel', 'college-life', 'Hostel life and discussions'),
('events', 'college-life', 'College events and activities'),
('sports', 'college-life', 'Sports and fitness discussions'),
('cafeteria', 'college-life', 'Food and cafeteria topics'),
('library', 'college-life', 'Library resources and study spaces'),
('workshops', 'college-life', 'Workshops and seminars'),

-- Service tags
('lost-found', 'services', 'Lost and found items'),
('rentals', 'services', 'Item rentals and sharing'),
('buy-sell', 'services', 'Buy and sell items'),
('roommates', 'services', 'Roommate finder and discussions'),
('services', 'services', 'General services and help'),

-- Feedback tags
('suggestions', 'feedback', 'Suggestions for improvement'),
('complaints', 'feedback', 'Complaints and issues'),
('college-changes', 'feedback', 'College change discussions'),
('ideas', 'feedback', 'New ideas and initiatives'),
('feedback', 'feedback', 'General feedback and opinions'),

-- Social tags
('rants', 'social', 'Rants and vents'),
('memes', 'social', 'Memes and humor'),
('discussions', 'social', 'General discussions'),
('help', 'social', 'Help and support'),
('shoutouts', 'social', 'Appreciation and shoutouts')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Create index for better tag performance
CREATE INDEX IF NOT EXISTS predefined_tags_category_idx ON predefined_tags(category);
CREATE INDEX IF NOT EXISTS predefined_tags_usage_count_idx ON predefined_tags(usage_count DESC);

-- Step 5: Add tag usage tracking function
CREATE OR REPLACE FUNCTION increment_tag_usage(tag_name TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE predefined_tags 
    SET usage_count = usage_count + 1 
    WHERE name = tag_name;
EXCEPTION
    WHEN OTHERS THEN
        -- Tag doesn't exist in predefined tags, ignore
        NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update posts table to better support tags
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS tag_count INTEGER DEFAULT 0 GENERATED ALWAYS AS (
    CASE 
        WHEN tags IS NULL THEN 0
        ELSE array_length(string_to_array(tags, ','), 1)
    END
) STORED;

-- Create index for tag filtering
CREATE INDEX IF NOT EXISTS posts_tags_idx ON posts USING GIN (to_tsvector('english', COALESCE(tags, '')));

-- Comments for documentation
COMMENT ON TABLE predefined_tags IS 'Predefined tags for content classification like Reddit flairs';
COMMENT ON COLUMN posts.tag_count IS 'Generated column for number of tags on a post';
