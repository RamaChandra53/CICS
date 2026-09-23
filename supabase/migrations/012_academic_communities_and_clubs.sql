-- ============================================================
-- Academic community access + official clubs
-- ============================================================

INSERT INTO communities (name, slug, description, icon, type) VALUES
  ('Persona Club', 'persona-club-tech', 'Tech club for builders, coding, and technical exploration', '💻', 'club'),
  ('Nova Club', 'nova-club', 'Open club space for student-led activities and events', '✨', 'club'),
  ('Idea Incubator Club', 'idea-incubator-club', 'Business, entrepreneurship, and startup ideas', '💡', 'club'),
  ('Literary Club', 'literary-club', 'Writing, reading, debate, and campus expression', '📚', 'club'),
  ('Photography Club', 'photography-club', 'Photography, editing, and visual storytelling', '📷', 'club'),
  ('Spotlight Club', 'spotlight-club-film', 'Film, cinema, and visual media', '🎬', 'club'),
  ('Beat Cruisers', 'beat-cruisers', 'Dance club group', '🕺', 'club'),
  ('Nithya', 'nithya-dance', 'Dance club group', '💃', 'club'),
  ('Symphony Club', 'symphony-club-music', 'Music, singing, instruments, and performances', '🎵', 'club'),
  ('Yoga & Spirituality Club', 'yoga-spirituality-club', 'Yoga, mindfulness, and spiritual wellbeing', '🧘', 'club'),
  ('Adobe Design Club', 'adobe-design-club', 'Design, creative tools, and digital art', '🎨', 'club'),
  ('Sports Club', 'sports-club', 'Sports, matches, and fitness events', '🏆', 'club'),
  ('UHV Club', 'uhv-club', 'Universal Human Values discussions and activities', '🤝', 'club')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  type = EXCLUDED.type;

CREATE OR REPLACE FUNCTION public.normalize_community_slug(target_slug TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN target_slug = 'college' THEN 'campus'
    ELSE target_slug
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.profile_can_use_academic_slug(
  p_year TEXT,
  p_branch TEXT,
  p_section TEXT,
  target_slug TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  year_number TEXT;
  branch_slug TEXT;
  section_slug TEXT;
BEGIN
  year_number := regexp_replace(COALESCE(p_year, ''), '[^0-9]', '', 'g');
  branch_slug := LOWER(COALESCE(p_branch, ''));
  section_slug := LOWER(COALESCE(p_section, ''));

  RETURN (
    (year_number <> '' AND target_slug = 'year-' || year_number)
    OR (branch_slug <> '' AND target_slug = branch_slug)
    OR (branch_slug <> '' AND section_slug <> '' AND target_slug = branch_slug || '-' || section_slug)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_join_community(target_user_id UUID, target_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized_slug TEXT;
  community_type TEXT;
  profile_record RECORD;
BEGIN
  normalized_slug := public.normalize_community_slug(target_slug);

  SELECT type INTO community_type
  FROM public.communities
  WHERE slug = normalized_slug;

  IF community_type IS NULL THEN
    RETURN FALSE;
  END IF;

  IF community_type IN ('open', 'club') THEN
    RETURN TRUE;
  END IF;

  SELECT year, branch, section INTO profile_record
  FROM public.profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN public.profile_can_use_academic_slug(
    profile_record.year,
    profile_record.branch,
    profile_record.section,
    normalized_slug
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_access_community(target_user_id UUID, target_slug TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized_slug TEXT;
BEGIN
  normalized_slug := public.normalize_community_slug(target_slug);

  IF public.can_join_community(target_user_id, normalized_slug) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = target_user_id
      AND community_slug = normalized_slug
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Communities are viewable by authenticated users" ON communities;
CREATE POLICY "Communities are viewable by authenticated users" ON communities
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      type IN ('open', 'club')
      OR public.can_access_community(auth.uid(), slug)
    )
  );

DROP POLICY IF EXISTS "Community members are viewable by authenticated users" ON community_members;
CREATE POLICY "Community members are viewable by authenticated users" ON community_members
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      auth.uid() = user_id
      OR public.can_access_community(auth.uid(), community_slug)
    )
  );

DROP POLICY IF EXISTS "Users can join communities themselves" ON community_members;
CREATE POLICY "Users can join communities themselves" ON community_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.can_join_community(user_id, community_slug)
  );

DROP POLICY IF EXISTS "Users can leave communities themselves" ON community_members;
CREATE POLICY "Users can leave communities themselves" ON community_members
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.slug = community_slug
        AND c.type IN ('open', 'club')
    )
  );

DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON posts;
CREATE POLICY "Posts are viewable by authenticated users" ON posts
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND public.can_access_community(auth.uid(), COALESCE(community_slug, room))
  );

DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = author_id
    AND public.can_access_community(auth.uid(), COALESCE(community_slug, room))
  );
