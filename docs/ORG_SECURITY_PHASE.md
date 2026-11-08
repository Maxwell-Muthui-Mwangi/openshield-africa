# Organization security phase — implementation on main

This phase adds an initial tenant management backend. It is gated by `ORGANIZATIONS_ENABLED=true`, which must remain **false outside approved private staging**.

## API (authenticated, same-origin)
- `POST /api/organizations/:id/invitations`: owner/admin invites a specific email for 48 hours; admins cannot invite admins or owners. Returns a single-use invitation token **to the inviter** for manual private-staging testing only. Do not expose this flow to public users; encrypted email delivery and token-safe onboarding UI are not implemented.
- `POST /api/organizations/invitations/accept`: invitation must match the signed-in user's verified email and cannot be reused.
- `POST /api/organizations/:id/members/:userId/role`: only the owner can change a non-owner role. Owner transfer/removal is not implemented.
- `GET /api/organizations/:id/audit`: member-scoped audit history, excluding token contents.
- `GET /api/organizations/:id/assets`: membership-scoped asset inventory.
- `POST /api/organizations/:id/assets`: owner/admin/analyst may register a hostname and receive a DNS TXT challenge. **Assets are not automatically verified or scanned**.

## Limitations and security gates
- The existing personal domains/assessments are not migrated to organizations. Organization assets are separate and require future DNS proof verification and scan authorization.
- No public invitation mailer, organization SSO, organization deletion/ownership transfer, audit retention policy or member removal yet.
- The database uses application-enforced membership checks; tenant-specific database RLS and least-privilege grants require independent review.
- Audit entries capture selected organization mutations, not a comprehensive tamper-evident activity history.
- No multi-tenant dashboard frontend has been built in this phase.
- Do not enable public network scanning or deploy publicly based solely on this change.
