# OpenShield Africa — MVP 0.1

A public-interest, open-source website security configuration assessment dashboard. It is **not** a penetration-testing tool, security certification, or production-hardened service.

## Quick start

Requires Node.js 20+.

```bash
npm install
npm test
npm run build
ALLOWED_DOMAINS=your-owned-domain.org npm run api
# in a second terminal
npm run dev
```

On Windows PowerShell, run `$env:ALLOWED_DOMAINS="your-owned-domain.org"` before `npm run api`.

Open http://localhost:5173. Enter the HTTPS root URL of a domain you control and have explicitly allowlisted. Without the API, the interface displays an **illustrative**, clearly labeled report.

## Safety and limitations

Only assess domains you own or have explicit written permission to test. The local API accepts only allowlisted HTTPS domain roots, blocks DNS responses in private and selected reserved ranges, pins the resolved address, sends a single HEAD request without following redirects, has a five-second timeout, and enforces a small request size limit.

**Do not expose the API to the public Internet.** Authentication, ownership-verification challenges, audit logging, per-user rate limits, improved IPv4/IPv6 egress policy, anti-rebinding defenses, and an independent security review are mandatory before public deployment. This prototype's simple configuration score only reflects the presence of selected security controls and must not be interpreted as proof of overall security.

## Development workflow

- `main`: stable repository landing page.
- `develop`: initial MVP and ongoing development.
- Merge to `main` through reviewed pull requests once build and tests pass.

## Planned milestones

1. Domain ownership verification and authenticated organisation workspaces
2. Persistent reports, accessibility, and remediation guidance
3. Restricted asynchronous assessment jobs and hardened network egress
4. Independent security review and consent-based pilot deployments

## Fellowship evidence

This is an initial implementation, **not** a claim of deployed users, pilots, partners, or achieved security outcomes. Maintain a public changelog, releases, and documented tests for verifiable progress.
