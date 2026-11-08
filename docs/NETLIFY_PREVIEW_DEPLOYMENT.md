# Netlify deployment: static frontend preview

**Status: Preview-only. Not production-ready.**

Netlify hosts the Vite/React dashboard, not the current Node HTTP API, SMTP outbox daemon or reassessment worker. Deploying the repository as a Netlify static site does **not** activate user accounts, database access, scanning, schedules or email delivery.

## Deploy preview
1. Connect the GitHub repository `Maxwell-Muthui-Mwangi/openshield-africa` in Netlify and select the `main` branch.
2. The committed `netlify.toml` configures `npm run build`, `dist` and Node 22.
3. Do not add `DATABASE_URL`, SMTP credentials or any backend secrets to the frontend build.
4. Netlify's `/api/*` requests intentionally return HTTP 503. The dashboard's example report is illustrative only; it is not a real security finding.
5. Protect the preview behind Netlify's available access controls if the site is not intended for public visibility. A preview-only static site is not a private backend.
6. Verify HTTPS, the SPA deep links, response security headers, API 503 behavior and that no secrets appear in `dist` or browser network traffic.

## Backend release plan
Use an independently secured private API runtime with an approved same-origin gateway. Do not set a public `VITE_API_URL` to a privileged backend or expose the database from the browser. A separate worker service is required for the existing PostgreSQL-backed reassessment scheduler and email outbox.

## Gate to live service
Actual private staging tests for Neon, SMTP, authentication cookies, authorized assessments, egress and SSRF protections, backup restoration and independent security review must pass before enabling any API or worker.

**No Netlify site has been created or published by committing these files.**
