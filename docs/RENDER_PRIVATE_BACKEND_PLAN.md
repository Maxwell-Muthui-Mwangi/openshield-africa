# Render private backend + Netlify frontend deployment plan

Frontend: https://openshieldkenya.netlify.app/ (static preview)
Backend: Render **private service**, not a public web service
Database: isolated Neon PostgreSQL (managed TLS)

## Important deployment boundary
The existing Node API binds to 127.0.0.1 and is **not yet compatible with Render's private service network ingress**. Do not set HOST=0.0.0.0 or expose a public Render web service until a reviewed authentication gateway, cookie/CSRF design, service-to-service network rules, egress controls and staging tests are complete.

Do not configure Netlify rewrites to forward /api/* to Render yet. Netlify's /api/* path intentionally returns 503. This protects users from assuming scanning or authentication is live.

## Render setup
1. Create a Render account/project for OpenShield Africa and connect the GitHub main branch.
2. Select a **private service** with restricted access and a plan supporting private networking. Do not choose a public web service.
3. Build using `npm ci`; Node version must match the repository's tested runtime.
4. Set runtime secrets in Render's environment configuration, never in GitHub or Netlify build variables.
5. Use isolated Neon credentials: `DB_MODE=managed`, `DATABASE_SSL=require`, `DATABASE_URL` with certificate validation.
6. Set `NODE_ENV=staging`, `COOKIE_SECURE=true`, `REGISTRATION_ENABLED=false`, `PUBLIC_SCAN_ENABLED=false`, `LOCAL_SCAN_ENABLED=false`, `REASSESSMENT_WORKER_ENABLED=false`, `OUTBOX_WORKER_ENABLED=false`.
7. Configure an approved authenticated SMTP service for staging only; do not send messages to real users.
8. Do not start the API or worker until the network and security design is reviewed.

## Acceptance before connecting frontend
- CI passes on exact deployed commit.
- Isolated database backup/restore and migration validation.
- Live Neon TLS and SMTP authentication/delivery checks.
- API ingress and egress policy tests, including SSRF and DNS rebinding.
- Same-origin cookie/session/CSRF gateway acceptance.
- Independent security assessment, remediation and retest.
- Explicit owner approval.

**Current release decision: NO_GO.** This document does not create or deploy a Render service.
