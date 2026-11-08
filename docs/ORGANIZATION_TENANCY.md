# Organization accounts — private staging foundation

This phase adds organization records, an explicit membership table and role vocabulary: `owner`, `admin`, `analyst`, `viewer`.

## Available authenticated endpoints
- `GET /api/organizations`: only organizations of the authenticated user.
- `POST /api/organizations`: create a team and owner membership atomically, **only when `ORGANIZATIONS_ENABLED=true`**.
- `GET /api/organizations/:id`: membership-gated organization details; unauthorized access returns 404.
- `GET /api/organizations/:id/members`: membership-gated member list.

There are **no invitations, member-role changes, organization domain attachments or organization-level assessments yet**. Existing personal domains and reports remain owned by their original users and cannot be accessed through organization membership. This avoids introducing an unsafe cross-tenant data migration.

## Deployment gates
- Default `ORGANIZATIONS_ENABLED` is unset/false. Only enable in private staging after migration 008 and access-control tests.
- Never infer organization membership from a user-provided ID, slug or email domain.
- Do not allow self-service role escalation. Membership mutations must be transactional and owner/admin authorized, with audit records.
- Future organization assets must use `organization_id` in every query, enforce access server-side and be tested against cross-tenant access.
- Database RLS / least-privilege grants, invitations, role lifecycle and audit events require a separate reviewed phase.
- The previous PR #15 integration suite ran multiple shared-queue test files concurrently and failed; this branch serializes those suites. A passing run must still be verified.

This is **not** an authorization to merge into `main` or deploy publicly.
