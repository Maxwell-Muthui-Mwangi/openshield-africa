BEGIN;
CREATE TABLE IF NOT EXISTS organization_reassessment_schedules(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 asset_id uuid NOT NULL REFERENCES organization_assets(id) ON DELETE CASCADE,
 authorized_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 interval_hours integer NOT NULL CHECK(interval_hours BETWEEN 24 AND 720),
 next_run_at timestamptz NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 lease_id uuid,
 lease_until timestamptz,
 last_run_at timestamptz,
 last_error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,asset_id)
);
CREATE INDEX IF NOT EXISTS org_reassess_due_idx ON organization_reassessment_schedules(next_run_at) WHERE enabled;
CREATE TABLE IF NOT EXISTS organization_remediation_evidence(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 remediation_id uuid NOT NULL REFERENCES organization_remediations(id) ON DELETE CASCADE,
 submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 note text NOT NULL CHECK(length(note) BETWEEN 8 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_evidence_idx ON organization_remediation_evidence(organization_id,remediation_id,created_at DESC);
REVOKE ALL ON organization_reassessment_schedules,organization_remediation_evidence FROM PUBLIC;
COMMIT;
