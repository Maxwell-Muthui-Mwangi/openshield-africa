# Neon PostgreSQL setup for OpenShield Africa

Neon is the selected **managed PostgreSQL provider**. OpenShield's Node API connects to Neon using the standard `pg` driver; the React browser application must **never** connect directly to PostgreSQL.

## Create and connect

1. In Neon, create a project named `openshield-africa` and a development database.
2. Copy the PostgreSQL connection string from Neon's dashboard. Use a direct connection for schema migrations and a pooled connection for application traffic when appropriate.
3. Supply these settings to the **server process only**:
   ```text
   DB_MODE=managed
   DATABASE_URL=<Neon PostgreSQL connection string>
   DATABASE_SSL=require
   DB_POOL_MAX=3
   APP_ORIGIN=http://localhost:5173
   COOKIE_SECURE=false
   ```
4. Install dependencies with `npm install`.
5. Run `npm run db:migrate` against the development database. This currently applies `db/001_init.sql`.
6. Run `npm run api` and `npm run dev` in separate terminals. Test account registration, DNS domain verification and saving a report with a domain you control.
7. Before any public deployment, set `APP_ORIGIN` to the real HTTPS origin and `COOKIE_SECURE=true`, and complete the security release blockers.

## Security

- Keep Neon credentials in deployment secrets, not GitHub, `.env.example`, `VITE_*` variables or client code.
- Use a dedicated least-privilege application role; do not use the migration/admin role for runtime traffic.
- Confirm TLS certificate verification; never disable verification to bypass a connection error.
- Restrict database network access where supported by your Neon plan.
- Enable and test backups/restore and monitoring available on your plan.
- Separate development and production databases or Neon branches; do not run test migrations against production.
- Rotate any exposed credentials immediately.
- For a Neon database, `db/002_managed_public_hardening.sql` is optional and designed primarily for providers exposing a public Data API. Review its role assumptions before applying it.

## Architecture

```text
React dashboard -> local Node.js API -> Neon PostgreSQL (managed)
                                OR -> Docker PostgreSQL (self-hosted)
```

The two environments are **alternatives**, not automatic replicas. Switching `DB_MODE` and `DATABASE_URL` changes the target database. Data migration and cutover must be planned separately.

## Verification checklist

- [ ] Neon project created
- [ ] Connection secret configured on the server
- [ ] Migration applied
- [ ] Authentication tested against Neon
- [ ] Domain verification tested
- [ ] Assessment report saved and retrieved
- [ ] Least-privilege database role reviewed
- [ ] Backup/restore validated

No hosted Neon database is provisioned merely by adding this guide.
