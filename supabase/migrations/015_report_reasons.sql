-- Allow the moderation UI's anonymous-safety report reasons.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE reports ADD CONSTRAINT reports_reason_check CHECK (
  reason IN (
    'spam',
    'harassment',
    'targeted_harassment',
    'inappropriate',
    'identity_exposure',
    'threats',
    'misinformation',
    'self_harm',
    'other'
  )
);
