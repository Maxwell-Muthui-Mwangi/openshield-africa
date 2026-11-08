BEGIN;
CREATE TABLE IF NOT EXISTS organizations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120),
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
 created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_members(
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('owner','admin','analyst','viewer')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members(user_id,organization_id);
-- This migration does not migrate personal domains or assessments.
-- Tenant ownership is opt-in; existing personal resources remain user-scoped.
REVOKE ALL ON organizations,organization_members FROM PUBLIC;
COMMIT;
