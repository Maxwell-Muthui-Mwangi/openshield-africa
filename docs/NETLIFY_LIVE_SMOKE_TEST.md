# Netlify live deployment verification

Deployment URL: https://openshieldkenya.netlify.app/

## Current scope
This deployment is **static frontend preview only**. No API, scanner, database, worker, user registration or SMTP credentials should be exposed through Netlify.

## Verify after Netlify finishes publishing main
1. In Netlify, check the production deploy SHA matches the intended GitHub `main` commit and that build command is `npm run build`, publish directory `dist`.
2. Visit the site over HTTPS and confirm the React dashboard renders.
3. Check `/api/domains` returns HTTP **503** with JSON code `API_NOT_DEPLOYED`. A 200 or 404 indicates the Netlify redirect/function may not be configured correctly.
4. Confirm deep links use the SPA fallback; verify CSP, X-Frame-Options and X-Content-Type-Options headers.
5. Check browser devtools for secrets and unexpected outbound requests. Never add `DATABASE_URL`, SMTP passwords or signing secrets to Netlify build variables.
6. Run the optional smoke test from an environment with outbound HTTPS access:
   `NETLIFY_PREVIEW_URL=https://openshieldkenya.netlify.app npm test`.
   This test is skipped when the URL variable is absent and is not evidence of a successful live deployment until executed against the published site.

## Next architecture gate
Before enabling real login, assessments or reports, deploy a private Node API and background workers in an approved backend runtime. Validate same-origin session cookie handling, CSRF controls, DNS proof, scanner egress, Neon TLS, SMTP delivery and independent security review.

**No backend is activated by this checklist.**
