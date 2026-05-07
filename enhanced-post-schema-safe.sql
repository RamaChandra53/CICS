-- Enhanced Posts Schema for Reddit-style Post Creation System (SAFE VERSION)
-- This migration is idempotent and can be run multiple times safely

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add new columns to posts table for enhanced functionality
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'poll', 'link')),
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array of tags
ADD COLUMN IF NOT EXISTS community_slug TEXT,
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_metadata JSONB, -- Store link preview metadata
ADD COLUMN IF NOT EXISTS poll_options TEXT[], -- Array of poll options
ADD COLUMN IF NOT EXISTS poll_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add foreign key constraint for community_slug (only if communities table exists and constraint doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communities' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'posts_community_slug_fkey' 
            AND table_name = 'posts' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE posts ADD CONSTRAINT posts_community_slug_fkey 
                FOREIGN KEY (community_slug) REFERENCES communities(slug);
        END IF;
    END IF;
END $$;

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
        array_agg(vote_count ORDER BY option_index) as option_counts,
        SUM(vote_count) as total_votes
    FROM (
        SELECT 
            post_id,
            option_index,
            COUNT(*) as vote_count
        FROM poll_votes
        GROUP BY post_id, option_index
    ) subvotes
    GROUP BY post_id
) votes ON p.id = votes.post_id
WHERE p.post_type = 'poll';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on poll_votes table
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON posts;
DROP POLICY IF EXISTS "Users can view their own drafts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create new posts policies
CREATE POLICY "Posts are viewable by authenticated users" ON posts
  FOR SELECT USING (auth.role() = 'authenticated' AND is_draft = FALSE);

CREATE POLICY "Users can view their own drafts" ON posts
  FOR SELECT USING (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = author_id);

-- Drop existing poll_votes policies safely
DROP POLICY IF EXISTS "Poll votes are viewable by authenticated users" ON poll_votes;
DROP POLICY IF EXISTS "Users can insert their own poll votes" ON poll_votes;
DROP POLICY IF EXISTS "Users can update their own poll votes" ON poll_votes;
DROP POLICY IF EXISTS "Users can delete their own poll votes" ON poll_votes;

-- Create new poll_votes policies
CREATE POLICY "Poll votes are viewable by authenticated users" ON poll_votes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own poll votes" ON poll_votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own poll votes" ON poll_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own poll votes" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('post-videos', 'post-videos', true) ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies safely
DROP POLICY IF EXISTS "Authenticated users can upload post videos" ON storage.objects;
DROP POLICY IF EXISTS "Post videos are publicly accessible" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Authenticated users can upload post videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Post videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-videos');
