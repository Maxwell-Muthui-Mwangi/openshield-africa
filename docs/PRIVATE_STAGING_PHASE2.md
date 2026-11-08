# Phase 2 — Private staging readiness and release decision

**This phase does not deploy, scan targets, or authorize production.**

## Environment setup
- Provision a dedicated private staging host with VPN/IP allowlisting, TLS, secure cookies, least-privilege runtime account and a restricted outbound firewall.
- Provision an isolated Neon or self-hosted PostgreSQL staging database, never a production database. Use a secrets manager for `DATABASE_URL`, SMTP credentials and encryption keys.
- Keep `REGISTRATION_ENABLED=false`, `PUBLIC_SCAN_ENABLED=false`, `REASSESSMENT_WORKER_ENABLED=false` and `OUTBOX_WORKER_ENABLED=false` for the initial preflight.
- Confirm backups, restore drill, database migrations, DNS verification, organization isolation and scanner egress restrictions before enabling any staging worker.
- Run `npm run staging:verify` only inside the approved private staging environment with `STAGING_VERIFY_ENABLED=true`. It verifies DB connectivity and SMTP authentication, **not delivery**.
- Send one explicitly authorized SMTP test message only after the operator confirms the test recipient and sender. Record delivery results without storing credentials or token-bearing links.
- Run integration tests against a disposable `_test` database. Do not use live organization assets for adversarial tests.

## Release evidence
The offline command `npm run release:preflight -- /path/to/private-evidence.json` expects a local evidence manifest containing `evidenceId` and `checks` with booleans: `ci`, `postgres`, `stagingDatabase`, `stagingSmtp`, `delivery`, `restore`, `egress`, `independentReview`, `reviewFindingsClosed`, `ownerApproval`.

An omitted or false check returns NO_GO. This is a **self-attestation aid**, not a cryptographically signed independent review. Do not commit the private evidence manifest; retain signed reviewer findings and operator proof in a controlled system.

## Mandatory review and release boundaries
- A qualified independent reviewer must conduct and sign the assessment. A checklist or automated scan is not a substitute.
- The scanner's SSRF/DNS pinning, IPv6 exclusion, egress, redirect and rate-limit defenses must be validated by the reviewer.
- Reassessment worker retries and cancellation must be tested under worker crashes, lease expiry, permission revocation and database disconnects.
- Evidence review decisions require a different user from the submitter; accepting evidence does not prove a fix is effective.
- Production deployment remains separately gated, even when the evidence manifest reports READY_FOR_OWNER_RELEASE_DECISION.
