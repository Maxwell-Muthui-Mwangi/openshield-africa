BEGIN;
ALTER TABLE organization_reassessment_schedules
 ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 4,
 ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
 ADD COLUMN IF NOT EXISTS last_success_at timestamptz;
ALTER TABLE organization_reassessment_schedules
 ADD CONSTRAINT reassessment_attempt_bounds CHECK(attempts>=0 AND max_attempts BETWEEN 1 AND 10);
ALTER TABLE organization_remediation_evidence
 ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
 ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
 ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
 ADD COLUMN IF NOT EXISTS review_note text,
 ADD CONSTRAINT evidence_review_status CHECK(review_status IN ('pending','accepted','rejected'));
COMMIT;
