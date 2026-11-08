# Dual PostgreSQL deployment: self-hosted and managed

OpenShield supports **two interchangeable PostgreSQL backends**, selected by `DB_MODE`. They use the same schema, query code and application API. Only **one database is active for a given API process**; there is no automatic replication, failover or synchronization between them.

## Option A — self-hosted PostgreSQL
1. Install Docker and Compose, or PostgreSQL 15+ on your own server.
2. Set a strong `POSTGRES_PASSWORD` in your shell and run `docker compose up -d postgres`.
3. Set `DB_MODE=self-hosted` and a matching `DATABASE_URL` in the API environment. The provided Compose database port binds to 127.0.0.1.
4. Set `DATABASE_SSL=disable` only for a local socket or loopback connection. For a remote self-hosted server, configure TLS and a trusted certificate.
5. Run `npm run db:migrate`, then `npm run api`.

## Option B — managed PostgreSQL
1. Create a managed PostgreSQL instance with a provider you trust, for example Supabase, Neon, AWS RDS or another PostgreSQL-compatible service.
2. Obtain its **server-side** PostgreSQL connection URL. Never expose it through Vite's `VITE_*` variables, browser code, GitHub or public logs.
3. Set `DB_MODE=managed`, `DATABASE_URL`, `DATABASE_SSL=require`, and an appropriate small `DB_POOL_MAX`.
4. If the provider requires its own certificate authority, use `DATABASE_SSL=verify-ca` and `DATABASE_CA_FILE` with the trusted CA certificate. Never use `rejectUnauthorized:false`.
5. Run `npm run db:migrate` using a database role authorised to create tables, then run the API with a **separate least-privilege application role**.
6. Enable provider-managed backups, retention, private networking/IP restrictions, monitoring and restore testing.

### Important Supabase note
The current SQL schema creates tables in `public`, which may be exposed through Supabase's Data API. **Do not run this schema on a public Supabase project without first securing exposure.** Prefer a private schema with explicitly limited access and no Data API exposure, or ensure all application tables have RLS enabled and `anon`/`authenticated` roles have no grants. This Node application uses its own account sessions; those are **not** Supabase Auth sessions and do not map to `auth.uid()`. Never expose the database credentials or a Supabase service-role key to the frontend.

## Switching between options
1. Back up and verify a restore of the source database.
2. Stop writes and assessments during cutover.
3. Export/import data with `pg_dump` and `pg_restore` using appropriate encryption and secure credentials.
4. Apply migrations to the destination and validate counts, foreign keys and ownership permissions.
5. Change the API's `DB_MODE` and `DATABASE_URL`, restart the API and test login, domain verification and report retrieval.
6. Retain the original database as a read-only rollback source until the cutover is verified.

**Do not configure both databases as writable peers.** There is no replication mechanism in this MVP.

## Release blockers
Both modes remain **local-development-only** for now. Production requires email verification, abuse controls, CSRF review, secure cookie configuration, independent network egress security review, backup/restore drills and database permission hardening.
