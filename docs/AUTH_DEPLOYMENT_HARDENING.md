# Authentication and deployment hardening — draft phase

## Delivered

- `POST /api/auth/resend-verification` sends a new verification link to eligible unverified accounts. Old links are invalidated.
- Password recovery and verification resend are limited to **3 requests/email/hour** and **12 requests/source/hour**, using PostgreSQL counters shared between API instances.
- Verification and password reset use a PostgreSQL transaction with a locked email-token row. Token consumption, user mutation and session revocation commit together; a concurrent replay cannot consume the same token twice.
- `npm run db:migrate` applies `005_auth_request_buckets.sql`.
- Production startup rejects insecure `APP_ORIGIN`, insecure cookies, missing SMTP/DB configuration, and enabled public scanning or open registration.
- The HTTP API continues to listen on loopback only.

## Important limitations

These are safeguards for an **unreleased prototype**, not a public deployment authorization.

- No live Neon database or SMTP account has been connected.
- Registration sends mail synchronously; mail failure can strand an unverified account. Add a transactional outbox, retries, and delivery monitoring.
- Recovery endpoints return generic messages, but timing and SMTP failures may still leak account existence; add asynchronous delivery and timing defenses.
- Request throttling uses fixed hourly windows and direct TCP peer addresses. A trusted reverse-proxy attribution policy and perimeter rate limits are needed.
- Cleanup of expired email tokens and stale request buckets must be scheduled.
- Configure `Referrer-Policy: no-referrer` on the **frontend host** too; API response headers alone do not protect URL tokens.
- Add restrictive CSP, HTTPS/HSTS at the reverse proxy, dependency scanning, log redaction, role-separated database credentials, backups, audit trails, and egress firewalling before any public service.
- All draft PRs must be reviewed and merged in dependency order. Do not merge a stacked PR directly into main without reviewing inherited changes.

## Testing

GitHub Actions uses a disposable PostgreSQL 16 service and a test mail sender; no external domains are scanned or emails sent. A passing CI run does not replace production penetration testing or a real mail delivery test.
