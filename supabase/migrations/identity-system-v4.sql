-- ============================================================
-- Identity System v4 Migration
-- Run this SQL in your Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- New profile columns for identity system
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS real_display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_pseudo_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo_username_status TEXT DEFAULT 'approved';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo_username_requested_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo_username_rejection_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pseudo_username_last_changed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_roll_number_publicly BOOLEAN DEFAULT FALSE;

-- Unique index on pseudo_username (only where not null)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pseudo_username_unique_idx
  ON profiles(pseudo_username) WHERE pseudo_username IS NOT NULL;

-- Index on pending usernames for moderator review queries
CREATE INDEX IF NOT EXISTS profiles_pending_pseudo_username_idx
  ON profiles(pending_pseudo_username)
  WHERE pending_pseudo_username IS NOT NULL;

-- Update display_mode constraints to allow 'pseudo' mode
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_display_mode_check;
ALTER TABLE posts ADD CONSTRAINT posts_display_mode_check CHECK (display_mode IN ('full', 'partial', 'anonymous', 'pseudo'));

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_display_mode_check;
ALTER TABLE comments ADD CONSTRAINT comments_display_mode_check CHECK (display_mode IN ('full', 'partial', 'anonymous', 'pseudo'));

-- ============================================================
-- Updated handle_new_user() trigger
-- Now auto-generates a pseudo_username on signup
-- ============================================================

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
  generated_pseudo TEXT;
  adj_list TEXT[] := ARRAY[
    'Silent','Lunar','Crimson','Echo','Ghost','Midnight','Static','Cosmic',
    'Neon','Frozen','Swift','Amber','Shadow','Crystal','Velvet','Iron',
    'Bright','Dusk','Coral','Storm','Nova','Sage','Arctic','Ember',
    'Misty','Solar','Rustic','Cobalt','Ashen','Vivid','Hollow','Onyx'
  ];
  noun_list TEXT[] := ARRAY[
    'Volt','Byte','Fox','Circuit','Pixel','Orbit','Leaf','Spark',
    'Wave','Cipher','Falcon','Drift','Prism','Raven','Flame','Comet',
    'Reed','Lynx','Surge','Glider','Flint','Crest','Bloom','Wisp',
    'Arrow','Pulse','Ridge','Pearl','Moss','Quartz','Blaze','Shard'
  ];
  adj_idx INT;
  noun_idx INT;
  suffix INT;
  attempt INT := 0;
BEGIN
  -- Generate pseudo username
  adj_idx := 1 + floor(random() * array_length(adj_list, 1))::int;
  noun_idx := 1 + floor(random() * array_length(noun_list, 1))::int;
  generated_pseudo := adj_list[adj_idx] || noun_list[noun_idx];

  -- Check uniqueness, append number if collision
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE pseudo_username = generated_pseudo) AND attempt < 50 LOOP
    attempt := attempt + 1;
    suffix := 1 + floor(random() * 999)::int;
    generated_pseudo := adj_list[adj_idx] || noun_list[noun_idx] || suffix::text;
  END LOOP;

  -- If still colliding after 50 attempts, use a UUID suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE pseudo_username = generated_pseudo) THEN
    generated_pseudo := adj_list[adj_idx] || noun_list[noun_idx] || substr(gen_random_uuid()::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (id, username, roll_number, is_anonymous, is_first_login, pseudo_username, pseudo_username_status)
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
    COALESCE((NEW.raw_user_meta_data->>'is_first_login')::boolean, true),
    generated_pseudo,
    'approved'
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
    WHEN normalized_branch = '' OR normalized_section = '' THEN NULL
    ELSE normalized_branch || '-' || normalized_section
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
    VALUES (UPPER(normalized_branch) || '-' || UPPER(normalized_section), section_slug, 'Your class section', '👥', 'auto')
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

-- Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
