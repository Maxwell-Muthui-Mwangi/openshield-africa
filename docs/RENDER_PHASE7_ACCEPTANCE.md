# Phase 7 — Render private backend acceptance

This phase adds regression checks for the separation between Netlify's static frontend and the private Node backend.

## Deployment invariants
- The Node API binds only to `127.0.0.1` in its current form.
- Netlify intercepts `/api/*` and returns an unavailable response; no public API gateway is deployed.
- Production registration and public scanning remain disabled.
- Render must not be configured as a public web service until the gateway design is independently reviewed.

## Operator checklist
1. Confirm Netlify publishes the latest passing `main` commit and verify its API requests return 503.
2. Provision a private Render environment and an isolated Neon staging database with validated TLS.
3. Confirm service networking is private and that no inbound public API route exists.
4. Run database migrations on the staging database only after backup.
5. Run staging connectivity verification and authorized SMTP delivery checks.
6. Conduct adversarial API and worker tests, followed by independent security review.
7. Only then design and validate an authenticated gateway between Netlify and the backend.

Do not treat a passing GitHub CI job as evidence of live staging connectivity, email delivery or independent penetration testing.
