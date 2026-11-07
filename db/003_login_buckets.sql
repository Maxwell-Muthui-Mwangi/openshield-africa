BEGIN;
CREATE TABLE IF NOT EXISTS login_buckets(
 bucket_key text PRIMARY KEY,
 attempts integer NOT NULL CHECK(attempts > 0),
 window_start timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_buckets_window_idx ON login_buckets(window_start);
REVOKE ALL ON TABLE login_buckets FROM PUBLIC;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON TABLE login_buckets FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON TABLE login_buckets FROM authenticated;
 END IF;
END $$;
COMMIT;
