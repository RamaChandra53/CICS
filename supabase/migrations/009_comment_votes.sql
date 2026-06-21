-- ============================================================
-- Migration: Create comment_votes table for comment voting
--
-- PROBLEM: CommentHorizontalVotes always shows 0 because
-- no comment_votes table exists and the component has
-- voting disabled with early returns.
--
-- SOLUTION: Create comment_votes table mirroring post_votes,
-- add upvotes/downvotes columns to comments table,
-- create trigger for count sync.
-- ============================================================

-- ── Step 1: Add upvotes/downvotes columns to comments ────────
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0 NOT NULL;

-- ── Step 2: Create comment_votes table ───────────────────────
CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, comment_id)
);

-- ── Step 3: Enable RLS ───────────────────────────────────────
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all comment votes
CREATE POLICY "Authenticated users can view comment votes"
  ON comment_votes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can insert own comment votes"
  ON comment_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own comment votes"
  ON comment_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own comment votes"
  ON comment_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Step 4: Create indexes ───────────────────────────────────
CREATE INDEX IF NOT EXISTS comment_votes_comment_id_idx ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS comment_votes_user_id_idx ON comment_votes(user_id);

-- ── Step 5: Create trigger for count sync ────────────────────
CREATE OR REPLACE FUNCTION sync_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE comments SET
      upvotes = (SELECT COUNT(*) FROM comment_votes WHERE comment_id = NEW.comment_id AND vote_type = 'up'),
      downvotes = (SELECT COUNT(*) FROM comment_votes WHERE comment_id = NEW.comment_id AND vote_type = 'down')
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET
      upvotes = (SELECT COUNT(*) FROM comment_votes WHERE comment_id = OLD.comment_id AND vote_type = 'up'),
      downvotes = (SELECT COUNT(*) FROM comment_votes WHERE comment_id = OLD.comment_id AND vote_type = 'down')
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_vote_count_sync ON comment_votes;
CREATE TRIGGER comment_vote_count_sync
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW EXECUTE FUNCTION sync_comment_vote_counts();

-- ── Step 6: Index for comments ordering ──────────────────────
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);
