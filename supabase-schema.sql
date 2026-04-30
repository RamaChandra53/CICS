-- College Internal Communication System (CICS) - Supabase Schema
-- Run this SQL in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  roll_number TEXT,
  year TEXT CHECK (year IN ('1st', '2nd', '3rd', '4th')),
  branch TEXT CHECK (branch IN ('CSE', 'ECE', 'IT', 'MECH', 'CIVIL', 'EEE', 'AIDS', 'AIML', 'MBA', 'MCA')),
  section TEXT CHECK (section IN ('A', 'B', 'C')),
  is_first_login BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  id_card_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  room TEXT NOT NULL CHECK (room IN ('college', 'year', 'branch', 'section', 'confessions', 'random')),
  content TEXT NOT NULL,
  image_url TEXT,
  is_anon_post BOOLEAN DEFAULT FALSE,
  year_tag TEXT,
  branch_tag TEXT,
  section_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_room_check;

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anon_comment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communities
CREATE TABLE IF NOT EXISTS communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT DEFAULT 'open',
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_members (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  community_slug TEXT REFERENCES communities(slug) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, community_slug)
);

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

-- Vote columns on posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- Post votes table
CREATE TABLE IF NOT EXISTS post_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Trigger function to keep upvotes/downvotes counts in sync
CREATE OR REPLACE FUNCTION update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
    ELSE
      UPDATE posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
      UPDATE posts SET upvotes = GREATEST(0, upvotes - 1), downvotes = downvotes + 1 WHERE id = NEW.post_id;
    ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
      UPDATE posts SET downvotes = GREATEST(0, downvotes - 1), upvotes = upvotes + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS post_vote_counts_trigger ON post_votes;
CREATE TRIGGER post_vote_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON post_votes
FOR EACH ROW EXECUTE FUNCTION update_post_vote_counts();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS posts_room_idx ON posts(room);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON comments(parent_comment_id);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by authenticated users" ON posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = author_id);

-- Comments policies
CREATE POLICY "Comments are viewable by authenticated users" ON comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = author_id);

-- Communities policies
CREATE POLICY "Communities are viewable by authenticated users" ON communities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Community members are viewable by authenticated users" ON community_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can join communities themselves" ON community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities themselves" ON community_members
  FOR DELETE USING (auth.uid() = user_id);

-- Post votes policies
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post votes are viewable by authenticated users" ON post_votes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert their own votes" ON post_votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON post_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON post_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for ID cards
INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards', 'id-cards', false) ON CONFLICT DO NOTHING;

-- Storage policies for id-cards bucket
CREATE POLICY "Authenticated users can upload ID cards" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'id-cards' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their own ID cards" ON storage.objects
  FOR SELECT USING (bucket_id = 'id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin users (those with is_verified = true who have been granted admin access)
-- can view all ID cards for the verification workflow.
-- To grant admin access, create an 'admins' table or use a custom claim.
-- Example: Create an admins table and check membership
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE POLICY "Admins can view all ID cards for verification" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'id-cards' AND
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY "Post images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

-- Function to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  normalized_branch TEXT;
  normalized_year TEXT;
  normalized_section TEXT;
  is_anon BOOLEAN;
  year_slug TEXT;
  branch_slug TEXT;
  section_slug TEXT;
BEGIN
  INSERT INTO public.profiles (id, username, roll_number, is_anonymous, is_first_login)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'roll_number',
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1),
      'user_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(NEW.raw_user_meta_data->>'roll_number', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true)
  );

  is_anon := COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false);
  normalized_branch := LOWER(COALESCE(NEW.raw_user_meta_data->>'branch', ''));
  normalized_year := regexp_replace(LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'year', ''), ' ', '')), '[^0-9]', '', 'g');
  IF normalized_year = '' THEN
    normalized_year := LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'year', ''), ' ', ''));
  END IF;
  normalized_section := LOWER(COALESCE(NEW.raw_user_meta_data->>'section', ''));

  year_slug := CASE WHEN normalized_year = '' THEN NULL ELSE 'year-' || normalized_year END;
  branch_slug := CASE WHEN normalized_branch = '' THEN NULL ELSE normalized_branch END;
  section_slug := CASE
    WHEN normalized_branch = '' OR normalized_section = '' OR normalized_year = '' THEN NULL
    ELSE normalized_branch || '-' || normalized_section || '-' || normalized_year
  END;

  INSERT INTO public.communities (name, slug, description, icon, type)
  VALUES ('Campus', 'campus', 'College-wide feed for everyone', '🏫', 'auto')
  ON CONFLICT (slug) DO NOTHING;

  IF year_slug IS NOT NULL THEN
    INSERT INTO public.communities (name, slug, description, icon, type)
    VALUES ('Year ' || UPPER(normalized_year), year_slug, 'Students in your year', '📅', 'auto')
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF branch_slug IS NOT NULL THEN
    INSERT INTO public.communities (name, slug, description, icon, type)
    VALUES (UPPER(normalized_branch), branch_slug, 'Students in your branch', '🎓', 'auto')
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  IF section_slug IS NOT NULL THEN
    INSERT INTO public.communities (name, slug, description, icon, type)
    VALUES (UPPER(normalized_branch) || '-' || UPPER(normalized_section) || '-' || UPPER(normalized_year), section_slug, 'Your class section', '👥', 'auto')
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  INSERT INTO public.community_members (user_id, community_slug)
  VALUES (NEW.id, 'campus')
  ON CONFLICT (user_id, community_slug) DO NOTHING;

  IF is_anon THEN
    INSERT INTO public.community_members (user_id, community_slug)
    VALUES (NEW.id, 'confessions')
    ON CONFLICT (user_id, community_slug) DO NOTHING;

    INSERT INTO public.community_members (user_id, community_slug)
    VALUES (NEW.id, 'rants')
    ON CONFLICT (user_id, community_slug) DO NOTHING;
  END IF;

  IF year_slug IS NOT NULL THEN
    INSERT INTO public.community_members (user_id, community_slug)
    VALUES (NEW.id, year_slug)
    ON CONFLICT (user_id, community_slug) DO NOTHING;
  END IF;

  IF branch_slug IS NOT NULL THEN
    INSERT INTO public.community_members (user_id, community_slug)
    VALUES (NEW.id, branch_slug)
    ON CONFLICT (user_id, community_slug) DO NOTHING;
  END IF;

  IF section_slug IS NOT NULL THEN
    INSERT INTO public.community_members (user_id, community_slug)
    VALUES (NEW.id, section_slug)
    ON CONFLICT (user_id, community_slug) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities
    SET member_count = member_count + 1
    WHERE slug = NEW.community_slug;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities
    SET member_count = GREATEST(0, member_count - 1)
    WHERE slug = OLD.community_slug;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS community_member_count_trigger ON community_members;
CREATE TRIGGER community_member_count_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin view for pending verifications
CREATE OR REPLACE VIEW pending_verifications AS
SELECT 
  p.id,
  p.username,
  p.full_name,
  p.roll_number,
  p.year,
  p.branch,
  p.section,
  p.id_card_url,
  p.created_at
FROM profiles p
WHERE p.is_verified = false AND p.is_anonymous = false AND p.id_card_url IS NOT NULL;
