# Reassessment, evidence and executive reporting

## Implemented on main
- Migration 011: PostgreSQL reassessment schedules with due timestamps, owner authorization, opt-in enable flag, lease ID/expiry, plus organization-scoped remediation evidence notes.
- `POST /api/organizations/:orgId/reassessments` configures a 24–720 hour interval for an organization-owned asset with current DNS proof; only owners/admins can configure it.
- `GET /api/organizations/:orgId/reassessments` returns schedules to authenticated members.
- `npm run reassess:run` runs one guarded batch of at most three due assessments. The worker must have `REASSESSMENT_WORKER_ENABLED=true`, `LOCAL_SCAN_ENABLED=true`, `ORGANIZATIONS_ENABLED=true` (API for configuration), and must **not** run with `NODE_ENV=production`. Do not configure cron or enable worker without private staging approval.
- Worker checks current DNS proof and continuing owner/admin membership when claiming; assessment service rechecks permissions and proof. Failed attempts disable the schedule. Database lease IDs fence late acknowledgments. A 2-minute lease assumes a bounded scanner; production would need stronger lease renewal and network timeout controls.
- `POST /api/organizations/:orgId/remediations/:id/evidence` records tenant-scoped evidence notes; `GET` lists them. Evidence notes are assertions, not independently verified fixes.
- `GET /api/organizations/:orgId/report.pdf` produces a small, text-only executive PDF summary with real counts and a disclaimer. The PDF is not a formal audit.
- Dashboard supports schedule configuration, evidence notes and PDF download.

## Release blockers
- Current reassessment worker is local-test only and must not be scheduled in production.
- Add stronger retry/backoff, worker lease renewal, cancellation/ownership revalidation after scanner network I/O, and independent network egress review.
- Add remediation evidence verification and immutable attachment storage before treating status 'resolved' as proof of remediation.
- SMTP/Neon staging tests, production proxy restrictions, backups and independent security assessment remain outstanding.
- Avoid claims of comprehensive vulnerability scanning: current engine checks a limited set of HTTP security headers.
