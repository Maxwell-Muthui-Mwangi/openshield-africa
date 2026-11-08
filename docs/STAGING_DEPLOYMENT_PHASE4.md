# Phase 4: Provider-neutral private staging deployment

Status: **configuration committed, infrastructure NOT provisioned**.

## Staging environment
Use `deploy/staging.env.example` as a template. Store real secrets only in `/etc/openshield/staging.env` (permissions 0600). Set `DB_MODE=managed`, `DATABASE_SSL=require` and an isolated Neon PostgreSQL URL with certificate verification. Never disable TLS verification.

Provide authenticated SMTP using port 465 or 587 and an approved staging sender. Credentials must come from the host's secret store. Never commit them.

Keep public registration, public scanning, local scanning and both workers disabled. Run `npm run staging:preflight` and resolve all failures before starting any service.

## Host setup
- Provision a private host with VPN/IP allowlisting and a separate restricted TLS reverse proxy.
- Install Node.js and dependencies from a pinned reviewed Git commit.
- Create an unprivileged `openshield` service account.
- Place application files under `/opt/openshield`; keep credentials outside the repository.
- Review `deploy/systemd/openshield-api-staging.service` before installation. It is intentionally not enabled at boot.
- The application listens on 127.0.0.1. Do not expose port 8787 publicly.
- Verify DNS, outbound firewall, TLS certificates, backups, least-privilege roles and reverse proxy request limits.
- Run database migrations only after a backup and recovery plan is approved.

## Acceptance tests
1. Verify current CI for the exact deployed SHA.
2. Run `npm run staging:preflight`.
3. Run `npm run staging:verify` to check real database and SMTP connectivity.
4. Confirm email delivery with a single authorized test recipient and record a redacted receipt.
5. Execute PostgreSQL integration tests against a disposable database ending `_test`.
6. Perform backup restoration and failure injection on isolated staging.
7. Obtain an independent security review, remediation and signed retest.
8. Run `npm run release:preflight -- /path/to/private-evidence.json` only with genuine evidence.

## Release status
No deployment, Neon connection, SMTP delivery, external penetration test or independent reviewer sign-off has been performed by these repository changes. Production remains NO_GO.
