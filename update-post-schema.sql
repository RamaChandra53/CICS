-- Update posts table to support additional content types
-- Run this in your Supabase SQL editor

-- Add missing columns for video and link posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_metadata JSONB;

-- Add storage bucket for post videos
INSERT INTO storage.buckets (id, name, public) VALUES ('post-videos', 'post-videos', true) ON CONFLICT DO NOTHING;

-- Storage policies for post-videos bucket
DROP POLICY IF EXISTS "Authenticated users can upload post videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload post videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-videos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Post videos are publicly accessible" ON storage.objects;
CREATE POLICY "Post videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-videos');

-- Update posts policy to allow all authenticated users to insert posts
-- This fixes potential RLS issues
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS posts_video_url_idx ON posts(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_link_url_idx ON posts(link_url) WHERE link_url IS NOT NULL;
