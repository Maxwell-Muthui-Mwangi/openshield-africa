# Email verification and account recovery

This phase adds an email ownership gate before login and a single-use password recovery workflow. It remains **development-only**, with no SMTP service configured in the repository.

## Configure

1. Run `npm run db:migrate` to apply `004_email_identity.sql`.
2. Set server-only `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` using your SMTP provider.
3. Set `APP_ORIGIN` to the application origin; locally `http://localhost:5173`.
4. For initial development registration only, set `REGISTRATION_ENABLED=true`. Disable it after setup.
5. The API must remain on localhost until deployment controls have been independently reviewed.

## Flow

- Register: creates an unverified account and sends a one-time verification link, valid 60 minutes.
- Verify: `POST /api/auth/verify-email` consumes the token and marks email verified.
- Login: verified accounts only; existing PostgreSQL login attempt budgets remain in force.
- Recover: `POST /api/auth/forgot-password` returns the same generic message for unknown and eligible accounts.
- Reset: `POST /api/auth/reset-password` consumes a one-time 20-minute token, changes the password and revokes all sessions.
- The frontend handles `/verify-email?token=...` and `/reset-password?token=...`.

Tokens are cryptographically random and only SHA-256 digests are stored in PostgreSQL. Tokens are not returned in the API response or printed to application logs. CI injects an in-memory email sender and does not send actual emails.

## Outstanding release blockers

- SMTP delivery and deliverability have not been tested against a real provider.
- No resend-verification UI or account deletion workflow yet.
- No MFA, per-email recovery request budget, outbound email queue, anti-enumeration timing equalization, or transactional token consumption.
- If SMTP delivery fails during registration, the account may exist but the user cannot verify it without an administrator remedy. This requires a retry/outbox design before public registration.
- Email tokens embedded in URLs can appear in browser history, referrer headers or logs. Enforce a strict Referrer-Policy and prevent third-party content on these pages.
- Do not expose the API publicly until CSRF, egress restrictions, account abuse protection, production database roles, backup/restore and independent security review are complete.
