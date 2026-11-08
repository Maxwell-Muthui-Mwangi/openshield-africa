# Multi-tenant dashboard, DNS ownership and reporting — main branch

## Implemented
- A responsive authenticated organization workspace with organization selector, member roster, role updates, invitation creation, DNS asset inventory, proof renewal and verification, audit feed and JSON summary export.
- Membership-checked `GET /api/organizations/:id/dashboard`, including asset counts, current DNS verification (30-day freshness), member counts and recent audit events.
- `POST /api/organizations/:id/assets/:assetId/verify`: validates a 48-character challenge, compares its hash, resolves the actual DNS TXT proof and records verified timestamp.
- `POST /api/organizations/:id/assets/:assetId/renew`: invalidates the old proof and returns a fresh DNS TXT challenge.
- Organization assets and reports remain isolated from personal assets and assessments.
- The dashboard intentionally shows **no security score** until organization assessments are implemented; zero is not used as a fabricated result.
- A client-side JSON organization summary includes inventory, membership count and recent activity. This is a summary, **not a completed vulnerability assessment or security certification**.

## Security and deployment
- Organization mutations remain behind `ORGANIZATIONS_ENABLED=true`. This flag is for controlled private staging only.
- DNS ownership verification is a prerequisite to any future organization scanning; this phase does not enable organization scans or public scanning.
- Invitations currently return a staging-only token to the inviter. A secure invitation email delivery flow, revoke endpoint, invitation rate limits and robust ownership transfer are still needed before public onboarding.
- Server authorization is checked on every organization resource read and mutation. Independent review and database-level tenant isolation remain release gates.
- Organization reporting will later require real verified assessment records, severity distribution, remediation evidence and scheduled reassessment history.

## Next engineering phases
1. Add verified organization assessment records with mandatory recent DNS proof, tightly controlled egress and immutable assessment snapshots.
2. Implement safe invitation mail delivery, revocation, member removal and tamper-resistant audit trail.
3. Build evidence-based remediation and risk prioritization, then executive PDF reporting and scheduled reassessments.
4. Complete SMTP, Neon, trusted proxy and independent security review before production release.
