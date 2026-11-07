BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
CREATE TABLE IF NOT EXISTS email_tokens(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('verify','reset')),
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_tokens_user_purpose_idx ON email_tokens(user_id,purpose);
REVOKE ALL ON TABLE email_tokens FROM PUBLIC;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON TABLE email_tokens FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON TABLE email_tokens FROM authenticated;
 END IF;
END $$;
COMMIT;
