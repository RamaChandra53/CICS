-- Public profile polish and identity preferences.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_identity TEXT DEFAULT 'pseudo';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name_snapshot TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_name_snapshot TEXT;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_bio_length_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_bio_length_check
  CHECK (bio IS NULL OR char_length(bio) <= 160);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_default_identity_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_default_identity_check
  CHECK (default_identity IN ('pseudo', 'full'));

DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public AS
SELECT
  id,
  pseudo_username,
  is_verified,
  is_email_verified,
  year,
  branch,
  section,
  real_display_name,
  full_name,
  bio,
  default_identity,
  pseudo_username_status,
  created_at
FROM profiles;

GRANT SELECT ON profiles_public TO authenticated;
GRANT SELECT ON profiles_public TO anon;

-- Public content views mask anonymous ownership while preserving moderation data
-- in the base tables for the service role.
CREATE OR REPLACE VIEW posts_public AS
SELECT
  p.id,
  CASE WHEN (p.is_anon_post OR p.display_mode = 'anonymous') AND auth.uid() <> p.author_id THEN NULL ELSE p.author_id END AS author_id,
  p.room, p.content, p.post_type, p.headline, p.description, p.tags,
  p.community_slug, p.is_draft, p.image_url, p.video_url, p.link_url,
  p.link_metadata, p.poll_options, p.poll_expires_at, p.is_anon_post,
  p.display_mode, p.author_name_snapshot, p.year_tag, p.branch_tag,
  p.section_tag, p.created_at, p.updated_at, p.upvotes, p.downvotes,
  CASE WHEN p.is_anon_post OR p.display_mode = 'anonymous' THEN NULL ELSE
    jsonb_build_object(
      'id', pr.id,
      'year', pr.year,
      'branch', pr.branch,
      'pseudo_username', pr.pseudo_username,
      'real_display_name', pr.real_display_name
    )
  END AS profiles,
  (SELECT count(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count
FROM posts p
LEFT JOIN profiles pr ON pr.id = p.author_id
WHERE p.is_draft = false OR auth.uid() = p.author_id;

CREATE OR REPLACE VIEW comments_public AS
SELECT
  c.id, c.post_id,
  CASE WHEN (c.is_anon_comment OR c.display_mode = 'anonymous') AND auth.uid() <> c.author_id THEN NULL ELSE c.author_id END AS author_id,
  c.parent_comment_id, c.content, c.is_anon_comment, c.display_mode,
  c.author_name_snapshot, c.upvotes, c.downvotes, c.created_at,
  CASE WHEN c.is_anon_comment OR c.display_mode = 'anonymous' THEN NULL ELSE
    jsonb_build_object(
      'id', pr.id,
      'year', pr.year,
      'branch', pr.branch,
      'pseudo_username', pr.pseudo_username,
      'real_display_name', pr.real_display_name
    )
  END AS profiles,
  jsonb_build_object('headline', p.headline, 'content', p.content, 'room', p.room) AS posts
FROM comments c
LEFT JOIN profiles pr ON pr.id = c.author_id
LEFT JOIN posts p ON p.id = c.post_id;

GRANT SELECT ON posts_public TO authenticated;
GRANT SELECT ON comments_public TO authenticated;

DROP POLICY IF EXISTS "Posts are viewable by authenticated users" ON posts;
CREATE POLICY "Public posts and own anonymous posts are directly viewable"
  ON posts FOR SELECT TO authenticated
  USING (NOT (is_anon_post OR display_mode = 'anonymous') OR auth.uid() = author_id);

DROP POLICY IF EXISTS "Comments are viewable by authenticated users" ON comments;
CREATE POLICY "Public comments and own anonymous comments are directly viewable"
  ON comments FOR SELECT TO authenticated
  USING (NOT (is_anon_comment OR display_mode = 'anonymous') OR auth.uid() = author_id);
