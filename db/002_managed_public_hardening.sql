-- Optional hardening for managed PostgreSQL installations that expose the public schema.
-- Review with your provider before running. Application uses server-side pg, not Data API.
-- This does not replace least-privilege application roles or independent security review.
BEGIN;
REVOKE ALL ON TABLE users,sessions,domains,assessments FROM PUBLIC;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON TABLE users,sessions,domains,assessments FROM anon;
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON TABLE users,sessions,domains,assessments FROM authenticated;
 END IF;
END $$;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
-- No policies are granted to browser/API roles. The trusted server-side
-- application database role must be separately designed and validated.
COMMIT;
