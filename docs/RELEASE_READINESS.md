# Release readiness: network, email and database

## Scanner egress
Live assessment is now disabled unless `LOCAL_SCAN_ENABLED=true` and `NODE_ENV` is **not** `production`. Even when enabled locally, the scanner performs a HEAD request on HTTPS port 443 only, rejects redirects, validates DNS A answers against non-public ranges, rejects any AAAA answers, and pins the selected IPv4 address for its TCP connection.

This is **not** a complete SSRF defense: domain rebinding and upstream proxy behavior need independent testing; outbound firewall rules must deny metadata, RFC1918, link-local, loopback, reserved, and internal destinations, including IPv6. Only explicitly authorized test domains may be assessed. Do not enable the scanner on a publicly accessible service.

## Email provider smoke test
Set `SMTP_HOST`, `SMTP_PORT=587` (STARTTLS) or `465` (implicit TLS), `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_FROM` in the server environment. Run `npm run smtp:verify` to test connection, TLS and authentication **without sending an email**. A subsequent controlled deliverability test to an owned mailbox is still required. Never commit SMTP credentials.

## Managed PostgreSQL / Neon
Use `docs/NEON_SETUP.md`. Set `DB_MODE=managed`, provider-issued `DATABASE_URL`, and verified TLS. Run migrations only after provisioning a disposable staging database and confirming backups. No live Neon credentials or project are configured in this repository.

## Reverse proxy / deployment
- Bind the Node API to loopback; place it behind a reviewed TLS-terminating reverse proxy.
- Allow only the approved frontend origin and implement trusted-proxy address attribution before relying on source-IP throttles.
- Apply `Referrer-Policy: no-referrer`, HSTS, a restrictive frontend CSP, request size limits, and access log redaction at the proxy.
- Block public scanner endpoints at the proxy until a formal egress and authorization review is completed.
- Implement a transactional email outbox with encrypted token-bearing payloads, retries, expiry and dead-letter handling before public account onboarding.
- Arrange independent security review, backup/restore drill, dependency scanning and incident response procedures.

**Current release gate:** development-only. A passing CI build does not authorize public deployment.
