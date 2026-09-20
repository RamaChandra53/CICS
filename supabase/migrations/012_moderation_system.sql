-- ============================================================
-- Migration 012: Configurable moderation system
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check CHECK (
  reason IN (
    'spam', 'harassment', 'targeted_harassment', 'inappropriate',
    'identity_exposure', 'threats', 'misinformation', 'self_harm', 'other'
  )
);

CREATE TABLE IF NOT EXISTS moderation_suspensions (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('mute', 'kick', 'ban')),
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('warn', 'remove_post', 'remove_comment', 'mute', 'kick', 'ban', 'unban')),
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE moderation_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Moderators can view suspensions" ON moderation_suspensions;
CREATE POLICY "Moderators can view suspensions" ON moderation_suspensions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Moderators can view moderation actions" ON moderation_actions;
CREATE POLICY "Moderators can view moderation actions" ON moderation_actions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS moderation_actions_created_at_idx ON moderation_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_target_user_idx ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS moderation_suspensions_ends_at_idx ON moderation_suspensions(ends_at);

-- Allow the existing admin workflow to display the label from profiles.
CREATE INDEX IF NOT EXISTS profiles_is_moderator_idx ON profiles(is_moderator) WHERE is_moderator = TRUE;

DROP POLICY IF EXISTS "Users can view their own suspension" ON moderation_suspensions;
CREATE POLICY "Users can view their own suspension" ON moderation_suspensions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
