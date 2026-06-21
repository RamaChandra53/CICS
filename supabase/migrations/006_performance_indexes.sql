-- Performance indexes for feed, posts, comments, votes, and profiles
-- Safe to run multiple times. Uses conditional checks for column differences.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'community_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS posts_community_id_idx ON posts(community_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'community_slug'
  ) THEN
    CREATE INDEX IF NOT EXISTS posts_community_slug_idx ON posts(community_slug);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'author_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'post_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'parent_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments(parent_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'parent_comment_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx ON comments(parent_comment_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'post_votes' AND column_name = 'post_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS post_votes_post_id_idx ON post_votes(post_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'post_votes' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS post_votes_user_id_idx ON post_votes(user_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'community_members' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS community_members_user_id_idx ON community_members(user_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'community_members' AND column_name = 'community_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS community_members_community_id_idx ON community_members(community_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'community_members' AND column_name = 'community_slug'
  ) THEN
    CREATE INDEX IF NOT EXISTS community_members_community_slug_idx ON community_members(community_slug);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'roll_number'
  ) THEN
    CREATE INDEX IF NOT EXISTS profiles_roll_number_idx ON profiles(roll_number);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'branch'
  ) THEN
    CREATE INDEX IF NOT EXISTS profiles_branch_idx ON profiles(branch);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'year'
  ) THEN
    CREATE INDEX IF NOT EXISTS profiles_year_idx ON profiles(year);
  END IF;
END $$;
