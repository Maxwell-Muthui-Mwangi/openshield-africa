BEGIN;
CREATE TABLE IF NOT EXISTS organization_invitations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 email text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','analyst','viewer')),
 token_hash text NOT NULL UNIQUE,
 invited_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(length(email) BETWEEN 3 AND 254)
);
CREATE INDEX IF NOT EXISTS org_invites_org_idx ON organization_invitations(organization_id,created_at DESC);
CREATE TABLE IF NOT EXISTS organization_audit_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL,
 target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_audit_org_idx ON organization_audit_events(organization_id,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS organization_assets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 hostname text NOT NULL,
 added_by uuid REFERENCES users(id) ON DELETE SET NULL,
 challenge_hash text NOT NULL,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,hostname)
);
CREATE INDEX IF NOT EXISTS org_assets_org_idx ON organization_assets(organization_id,created_at DESC);
REVOKE ALL ON organization_invitations,organization_audit_events,organization_assets FROM PUBLIC;
COMMIT;
