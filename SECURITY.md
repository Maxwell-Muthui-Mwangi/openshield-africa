# Security policy

**This code is a research prototype. Do not expose its assessment API publicly.**

## Authorisation
Only scan websites you own or that have explicitly authorised you. Operators must configure an explicit ALLOWED_DOMAINS list. The assessment API is bound to localhost; its controls are not a substitute for an independently reviewed public-facing architecture.

## Reporting
Please privately disclose security issues to the project owner using GitHub's private vulnerability reporting feature when enabled. Do not include credentials, live exploitation details, personal information, or secrets in public issues.

## Threat model and known limitations
- Arbitrary URL fetching is intentionally restricted to allowlisted HTTPS origins and a single read-only HEAD request.
- Private and special-purpose network egress requires more comprehensive validation and ideally network-level enforcement.
- No account authentication, verified domain ownership, or persistent audit logging exists yet.
- Header presence does not prove effective configuration. Scores are educational heuristics, not security certifications.
- DNS lookup, TLS checks, and connection errors can contain sensitive operational metadata; do not publish private findings.
- Never provide the assessment service as a public unauthenticated API.

## Release gate
Before deployment of remote assessment: domain ownership proof, role-based access, SSRF egress enforcement, strict redirect policy, rate limiting, independent security testing and observability.
