# OpenShield Africa — next-generation engineering roadmap

## Current phase: secure, private staging

This branch hardens the existing OpenShield authentication email outbox before any public release.

### Implemented here
- **Lease fencing:** each batch claim has a unique UUID lease, so a late/outdated worker cannot overwrite a reclaimed job's final state.
- **Concurrent-safe token rotation:** per-user row locking serializes simultaneous resends; previous queued and leased messages are marked dead and have ciphertext scrubbed.
- **Expired-message cleanup before claims:** expired token links never enter a new dispatch batch.
- **Safe operational visibility:** queue metrics include counts and oldest due age; error categories use a fixed allowlist to reduce secrets leaking into logs.
- **Regression coverage:** integration tests for parallel workers, retries, stale links and expired payload cleanup.

### Remaining release gates
1. Independent security assessment of network egress / SSRF resistance and IPv6, domain ownership, authentication and reverse proxy behavior.
2. Verified real SMTP-provider delivery, bounce handling, complaint handling, transactional mail rate limits, timeout and idempotency policy.
3. A private PostgreSQL staging environment, backups, tested restore, least-privilege DB roles and secret/key rotation.
4. End-to-end staging tests for DNS ownership verification, account lifecycle, deployment boundaries and worker crash recovery.
5. Observability: restricted alerting, queue health SLOs, incident playbooks, and audit/event retention.
6. Branch protection, signed release review and staged rollout. **Public scanning remains disabled**; do not enable it solely because CI is green.

### Product roadmap beyond this phase
- Risk-based assessment orchestration with strong per-domain ownership authorization and constrained egress.
- Tenant-scoped security findings, reproducible evidence, remediation guidance and verified rescan comparison.
- Portfolio-level dashboards and prioritized security posture trends.
- Privacy-conscious notifications, organization roles, delegated domain administration and policy controls.
- Offline-friendly, mobile-first, accessible dashboards and SME-specific educational guidance.

**Status:** Reviewable GitHub development work. This is not security certification, live SMTP testing, deployment or production readiness.
