# Authentication, domain verification and persistence

## Status
Implemented in the `feature/auth-domain-storage` branch for **local development only**. This is not a completed production security review.

## Database
Requires PostgreSQL 15+ and a database/user you control. Set `DATABASE_URL` in the API process environment. Run `npm run db:migrate`. SQL migration is in `db/001_init.sql`.

## Account flow
- `POST /api/auth/register` accepts email and password (minimum 12 characters).
- `POST /api/auth/login` sets an HttpOnly, SameSite=Strict session cookie.
- `GET /api/auth/me` returns the signed-in user.
- `POST /api/auth/logout` invalidates the stored session.
- Sessions are hashed in PostgreSQL and expire after seven days.

## Domain flow
- `POST /api/domains` with `{"url":"https://example.org"}` creates a pending domain and returns a TXT challenge.
- Publish TXT at `_openshield-challenge.example.org` with the exact returned value.
- `POST /api/domains/<id>/verify` with `{"token":"<returned token>"}` verifies the TXT record.
- Only a signed-in account with a verified domain can call `POST /api/assess`.
- `GET /api/assessments` lists the signed-in user's assessment metadata; `GET /api/assessments/<id>` fetches their report.

## Important limitations and deployment blockers
- No email verification, password reset, MFA, or account abuse controls.
- Single-process in-memory rate limiter is not suitable for multi-instance deployment.
- Registration does not yet require invitation or anti-bot verification.
- DNS TXT control is checked only once; domain ownership must be periodically revalidated.
- Domain ownership proof is not sufficient authorisation for every security activity.
- Database encryption, backups, migrations history and data retention/deletion policies are not configured.
- The scanner only checks IPv4 DNS records; IPv6 egress requires a separate review.
- Stronger network-level egress filtering and independent security testing remain necessary.
- The UI is being adapted for authenticated use; do not publicly expose the API.
- Production reverse proxy must terminate TLS, enforce `COOKIE_SECURE=true`, trusted origins, strict host validation and CSRF protections.

Never place a real database password or session token in GitHub.
