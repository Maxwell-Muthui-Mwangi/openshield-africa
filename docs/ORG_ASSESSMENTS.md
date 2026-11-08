# Organization assessments — main branch

## Implemented
- Migration 010 creates tenant-scoped assessment snapshots and remediation rows.
- Organization assessment service checks owner/admin/analyst membership and a current (<30 days) DNS proof **before any network request**; repeats checks before saving the result.
- Existing safe assessment engine remains opt-in for local testing only (`LOCAL_SCAN_ENABLED=true`, non-production), with no redirect following and restrictive address checks. Organization endpoints also require `ORGANIZATIONS_ENABLED=true`.
- Findings are ordered by explicit severity (critical, high, medium, low); this is **not** AI-based risk prediction or verified exploitability.
- Remediation items track open, in-progress and resolved states with organization authorization checks.
- Member-scoped reporting endpoint returns up to 100 assessment snapshots and 500 remediation items. JSON export is available from the dashboard.
- The dashboard does not manufacture scores when no assessments exist.

## Routes
- `POST /api/organizations/:orgId/assets/:assetId/assess`: local testing only, requires active DNS proof and organization permissions.
- `GET /api/organizations/:orgId/report`: authenticated organization member, returns assessment snapshots and remediation status.
- `POST /api/organizations/:orgId/remediations/:id`: owner/admin/analyst status update.

## Still outstanding
- Automated reassessment **not implemented**: scheduling requires a durable queue, owner authorization lifecycle, opt-out, revalidation at execution time, rate limits and a reviewed worker egress policy.
- Executive PDF output, trends, verified resolution evidence and multi-factor risk scoring are future work. Current export is JSON.
- Public scanning and production deployment remain disabled until independent security review, SMTP/Neon validation and infrastructure hardening.
- Do not treat heuristic configuration scores as a comprehensive vulnerability assessment or security certification.
