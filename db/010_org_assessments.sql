BEGIN;
CREATE TABLE IF NOT EXISTS organization_assessments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 asset_id uuid NOT NULL REFERENCES organization_assets(id) ON DELETE CASCADE,
 initiated_by uuid REFERENCES users(id) ON DELETE SET NULL,
 score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_assessments_timeline ON organization_assessments(organization_id,created_at DESC);
CREATE TABLE IF NOT EXISTS organization_remediations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 assessment_id uuid NOT NULL REFERENCES organization_assessments(id) ON DELETE CASCADE,
 finding_key text NOT NULL,
 severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
 assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(assessment_id,finding_key)
);
CREATE INDEX IF NOT EXISTS org_remediations_scope ON organization_remediations(organization_id,status);
REVOKE ALL ON organization_assessments,organization_remediations FROM PUBLIC;
COMMIT;
