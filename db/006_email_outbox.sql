BEGIN;
CREATE TABLE IF NOT EXISTS email_outbox(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('verify','reset')),
 payload bytea NOT NULL,
 iv bytea NOT NULL,
 auth_tag bytea NOT NULL,
 key_version integer NOT NULL DEFAULT 1,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','dead')),
 attempts integer NOT NULL DEFAULT 0,
 max_attempts integer NOT NULL DEFAULT 5,
 available_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 expires_at timestamptz NOT NULL,
 last_error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS email_outbox_due_idx ON email_outbox(available_at) WHERE status IN ('pending','sending');
REVOKE ALL ON TABLE email_outbox FROM PUBLIC;
COMMIT;
