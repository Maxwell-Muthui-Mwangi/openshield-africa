# Independent security review and private staging acceptance plan

**Status: NOT APPROVED FOR PUBLIC DEPLOYMENT.** This checklist is preparation for a review, not evidence that a qualified independent reviewer has completed one.

## Private staging verification (operator action required)
1. Provision isolated staging PostgreSQL/Neon and SMTP credentials via a secrets manager. Do not commit credentials or paste them into issues.
2. Disable public registration and public scanning; restrict ingress to a trusted VPN/IP allowlist, configure TLS, secure cookies, trusted proxy and restrictive outbound firewall.
3. Run migrations through 012 on a disposable staging database, check backups, test a restore and verify least-privilege database roles.
4. Set `STAGING_VERIFY_ENABLED=true` and run `npm run staging:verify` from the private staging host. This checks database query and SMTP authentication/connectivity only. It **does not send an email** or establish deliverability.
5. To validate delivery, use an explicitly authorized staging recipient and a single-use verification link; inspect actual receipt, headers, expiry, resend, retries, cancellation and outbox dead-letter handling. Redact all tokens and addresses from logs.
6. Test Neon reconnects, migration idempotence, rollback/restore, TLS certificate validation, pool exhaustion and failed authentication.
7. Exercise schedule opt-in/disable, concurrent workers, lease expiration, crash/retry, cancellation while a scan is in flight, permission revocation and DNS proof expiration.
8. Verify no scanning of RFC1918, loopback, link-local, IPv6, metadata endpoints or redirect targets. Review DNS rebinding, DNS pinning and outbound firewall policy.

## Independent reviewer scope
- Auth/session/CSRF, password recovery, token rotation, SMTP secret storage and invite replay.
- Multi-tenant authorization, IDOR, owner role changes, organization asset and evidence access, and DB row-level security.
- Scanner SSRF, DNS rebinding, egress firewall, TLS and request timeouts.
- Job lease fencing, retry/backoff, cancellation and at-most-once persistence vs at-least-once network execution.
- Audit integrity, evidence review separation of duties, PDF injection/escaping, report sensitivity and data retention.
- Dependency and container scans, SBOM, SAST, DAST in isolated staging and penetration testing within written scope.
- Threat model, privacy impact, incident response, backup restore and disaster recovery.

## Release acceptance evidence
Record CI run URLs, staging build SHA, test results, operator sign-off, reviewer identity/independence, review date, severity-ranked findings, remediation commits and retest results. A qualified independent reviewer must issue a signed report and explicit go/no-go recommendation. Product owner must separately approve production release.

## Current limitations
The worker is intentionally local-test only. Bounded retry, lease fencing and cancellation checks reduce risk but do not guarantee exactly-once network execution; scanner timeouts, heartbeat and robust shutdown need further adversarial testing. Evidence review is a human acceptance decision, not cryptographic proof or automatic verification of remediation. SMTP and Neon connectivity remain unverified until executed in the real staging environment.
