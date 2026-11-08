# Database-backed login throttling

OpenShield's local authentication API applies two PostgreSQL-backed login request budgets:

- **Account identity:** 5 login attempts in a rolling 15-minute window (implemented as fixed-window refresh after expiry).
- **Source IP:** 30 login attempts per 15-minute window.
- Every attempt consumes both budgets before password verification. Exceeding either budget returns HTTP **429** with a `Retry-After: 900` header.
- Successful login clears the account budget, but **not** the source IP budget; a login to a different account cannot reset the shared source-IP limit.
- Bucket keys are SHA-256 digests of normalized identities and source addresses, not raw emails or IPs.
- Limits are shared by all API instances using the same PostgreSQL database.

## Setup

Run `npm run db:migrate` to apply `db/001_init.sql` and `db/003_login_buckets.sql`. The `db/002_managed_public_hardening.sql` migration remains a reviewed, **optional** provider-specific step; it is not run automatically.

For local testing, `npm run test:integration` requires a disposable PostgreSQL database whose name ends in `_test`, supplied using `INTEGRATION_DATABASE_URL`. GitHub Actions provisions PostgreSQL 16 and runs the suite automatically.

## Remaining limitations

- This control does not verify email ownership, prevent account enumeration at registration, or provide MFA.
- IP attribution is derived from the direct TCP peer. Production deployment behind a proxy needs an explicit trusted-proxy strategy; **do not blindly trust `X-Forwarded-For`**.
- Fixed windows, simultaneous requests, distributed traffic, and network-level abuse still need a dedicated threat review.
- Application credentials must have narrowly scoped database permissions; do not expose the `login_buckets` table through a public Data API.
- Older buckets must be purged via a scheduled maintenance process (for example, `DELETE FROM login_buckets WHERE window_start < now() - interval '30 days'`) with monitoring. This is not automated yet.
- Do not publicly deploy the scanner or auth service until production hardening and a security review have been completed.
