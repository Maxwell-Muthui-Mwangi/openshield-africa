# Phase 3 — Private staging validation runbook

## Completed in repository
- A safe-by-default example environment is in `deploy/staging.env.example`.
- `npm run staging:preflight` validates the intended private staging settings without making network connections.
- `npm run staging:verify` checks PostgreSQL and SMTP authentication/connectivity only when `STAGING_VERIFY_ENABLED=true` and credentials exist.
- Release decision remains NO_GO without signed evidence of staging checks, review and owner approval.

## Operator procedure (not yet executed)
1. Provision an isolated staging host and database; restrict inbound traffic to approved VPN/IP addresses. Ensure outbound network policy denies private, metadata and unapproved destinations.
2. Install runtime and dependencies from a pinned commit. Configure `/etc/openshield/staging.env` outside the repository with restrictive permissions. Do not commit or paste credentials.
3. Use a real HTTPS `APP_ORIGIN`, `COOKIE_SECURE=true`, public features disabled, scanner disabled and workers disabled.
4. Run `npm run staging:preflight`; record its output and commit SHA.
5. Run `npm run db:migrate` only on the isolated staging database after backup/restore rehearsal.
6. Run `npm run staging:verify`; record database and SMTP connectivity outcomes. This does not verify actual email delivery.
7. With an approved staging sender and recipient, run a separate email delivery acceptance test; check arrival, link expiration, resend and outbox retries.
8. Run the integration suite against a disposable database ending in `_test`; verify isolation, cancellation, lease fencing and role revocation.
9. Request a qualified independent security assessment and remediate findings before production approval.

## Evidence and release
Keep CI URLs, staging logs with secrets redacted, database restore evidence, email delivery receipt, outbound firewall tests and signed reviewer report in a restricted evidence store. Run `npm run release:preflight -- /path/to/evidence.json` only after each check has real evidence. Do not use placeholder true values.

**No deployment has been performed by this phase.**
