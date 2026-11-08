BEGIN;
CREATE TABLE IF NOT EXISTS auth_request_buckets(
 bucket_key text PRIMARY KEY,
 attempts integer NOT NULL CHECK(attempts>0),
 window_start timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_request_buckets_window_idx ON auth_request_buckets(window_start);
REVOKE ALL ON TABLE auth_request_buckets FROM PUBLIC;
COMMIT;
