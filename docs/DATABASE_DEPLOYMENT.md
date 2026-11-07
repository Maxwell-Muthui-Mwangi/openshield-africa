# Database deployment: self-hosted and managed

OpenShield supports **two PostgreSQL deployment profiles** using the same schema and SQL queries. Each running application uses **one** database, selected by `DB_MODE` and `DATABASE_URL`.

## Profile A — Self-hosted
1. Copy `.env.self-hosted.example` to a local untracked file or export its variables in your shell.
2. Choose a strong `POSTGRES_PASSWORD` and start `docker compose up -d postgres`.
3. Export a matching `DATABASE_URL` (URL-encode reserved password characters).
4. Run `npm install && npm run db:migrate`.
5. Run `npm run api` and `npm run dev` in separate shells.
6. Restrict PostgreSQL to localhost/private networks, schedule encrypted backups and test restores.

## Profile B — Managed
1. Provision PostgreSQL 15+ with your chosen managed provider (e.g. a provider offering managed Postgres).
2. Create a dedicated least-privilege database account. Use a separate migration account where supported.
3. Export `DB_MODE=managed`, `DATABASE_URL` and `DATABASE_SSL=require` using the hosting provider's secret manager.
4. Confirm the provider's TLS certificate validates against the runtime's trusted CA bundle. Do not disable certificate verification.
5. Run `npm run db:migrate` with migration credentials, then start the API with the application credentials.
6. Enable managed backups, point-in-time recovery where offered, monitoring and tested restoration procedures.
7. Restrict database connectivity to the application network, VPN or provider-supported allowlists.

## Environment isolation
- Local/staging/production must have separate databases and credentials.
- Never put database URLs containing passwords in Git, browser JavaScript or public logs.
- Do not configure two active writable databases for the same application instance.
- Do not replicate security findings to another provider without a documented privacy, encryption and data-retention plan.
- A managed database does not make the public assessment API safe by itself.

## Migration and recovery
Use the SQL migration in `db/001_init.sql` with `npm run db:migrate`. This is an initial idempotent schema, **not yet a versioned migration system**. Before production, add versioned migrations, rollback procedures, encrypted backups and restore tests.

## Release blockers
Email verification, account abuse protection, durable distributed rate limits, robust CSRF protection, ownership re-verification, network-level SSRF prevention, and independent security review remain required before public deployment.
