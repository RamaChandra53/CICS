-- Enhanced Posts Schema for Reddit-style Post Creation System
-- Run this migration to update the posts table structure

-- Add new columns to posts table for enhanced functionality
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'poll', 'link')),
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array of tags
ADD COLUMN IF NOT EXISTS community_slug TEXT REFERENCES communities(slug),
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_metadata JSONB, -- Store link preview metadata
ADD COLUMN IF NOT EXISTS poll_options TEXT[], -- Array of poll options
ADD COLUMN IF NOT EXISTS poll_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing posts to have post_type = 'text' and move content to description
UPDATE posts 
SET post_type = 'text', 
    description = content,
    headline = CASE 
        WHEN LENGTH(content) > 100 THEN SUBSTRING(content, 1, 97) || '...'
        ELSE content
    END
WHERE post_type IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS posts_post_type_idx ON posts(post_type);
CREATE INDEX IF NOT EXISTS posts_community_slug_idx ON posts(community_slug);
CREATE INDEX IF NOT EXISTS posts_tags_idx ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS posts_is_draft_idx ON posts(is_draft);
CREATE INDEX IF NOT EXISTS posts_poll_expires_at_idx ON posts(poll_expires_at) WHERE poll_expires_at IS NOT NULL;

-- Create poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    option_index INTEGER NOT NULL CHECK (option_index >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id) -- One vote per user per poll
);

-- Create poll results view for easy querying
CREATE OR REPLACE VIEW poll_results AS
SELECT 
    p.id as post_id,
    p.poll_options,
    COALESCE(votes.option_counts, ARRAY[]::integer[]) as vote_counts,
    COALESCE(votes.total_votes, 0) as total_votes
FROM posts p
LEFT JOIN (
    SELECT 
        post_id,
        array_agg(option_index ORDER BY option_index) as option_indices,
        array_agg(COUNT(*) ORDER BY option_index) as option_counts,
        COUNT(*) as total_votes
    FROM poll_votes
    GROUP BY post_id, option_index
) votes ON p.id = votes.post_id
WHERE p.post_type = 'poll';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update RLS policies for new columns
DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON posts;
CREATE POLICY "Posts are viewable by authenticated users" ON posts
  FOR SELECT USING (auth.role() = 'authenticated' AND is_draft = FALSE);

DROP POLICY IF EXISTS "Users can view their own drafts" ON posts;
CREATE POLICY "Users can view their own drafts" ON posts
  FOR SELECT USING (auth.role() = 'authenticated' AND author_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

-- Poll votes RLS
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll votes are viewable by authenticated users" ON poll_votes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own poll votes" ON poll_votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own poll votes" ON poll_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own poll votes" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('post-videos', 'post-videos', true) ON CONFLICT DO NOTHING;

-- Storage policies for videos
CREATE POLICY "Authenticated users can upload post videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Post videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-videos');
