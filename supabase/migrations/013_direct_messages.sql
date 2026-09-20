-- Persistent one-to-one direct messages.
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS direct_messages_sender_recipient_created_idx
  ON direct_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_sender_created_idx
  ON direct_messages(recipient_id, sender_id, created_at DESC);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read direct messages" ON direct_messages;
CREATE POLICY "Participants can read direct messages"
  ON direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Recipients can mark direct messages read" ON direct_messages;
CREATE POLICY "Recipients can mark direct messages read"
  ON direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
