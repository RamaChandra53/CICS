-- ============================================================
-- Migration 003: Community System
-- Consolidated from: create-basic-communities.sql,
--   reddit-hybrid-communities.sql, alumni-community.sql
-- ============================================================

-- Ensure communities table exists (created in 001_base_schema.sql)
-- Insert core communities
INSERT INTO communities (name, slug, description, icon, type) VALUES
  ('Campus', 'campus', 'College-wide feed for everyone', '🏫', 'auto'),
  ('Confessions', 'confessions', 'Anonymous only. No identity shown.', '🎭', 'open'),
  ('Placements', 'placements', 'Internships, PPOs, interview experiences', '💼', 'open'),
  ('Clubs', 'clubs', 'College clubs and events', '🎯', 'open'),
  ('Alumni', 'alumni', 'Alumni network and connections', '🎓', 'open')
ON CONFLICT (slug) DO NOTHING;

-- Community member count sync trigger (also in 001_base_schema.sql, safe to re-create)
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

-- Community members index
CREATE INDEX IF NOT EXISTS community_members_community_slug_idx
  ON community_members(community_slug);
