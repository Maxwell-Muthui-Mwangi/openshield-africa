-- Make every worker claim a separate delivery lease and stop concurrent token rotations.
BEGIN;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS lease_id uuid;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS email_outbox_expiry_idx ON email_outbox(expires_at)
 WHERE status IN ('pending','sending');
COMMIT;
