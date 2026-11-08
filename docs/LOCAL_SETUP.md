# Local authenticated MVP setup

Requirements: Node.js 22+, npm, Docker with Compose (or PostgreSQL 15+).

1. Set a strong local `POSTGRES_PASSWORD` in your shell. Do not commit it.
2. Run `docker compose up -d postgres`.
3. Set `DATABASE_URL=postgresql://openshield:<your password>@127.0.0.1:5432/openshield` in the shell running the API.
4. Run `npm install`, then `npm run db:migrate`.
5. Set `APP_ORIGIN=http://localhost:5173`.
6. Start `npm run api` and in another terminal `npm run dev`.
7. For initial local account creation only, set `REGISTRATION_ENABLED=true` on the API process, register an account, then restart the API with `REGISTRATION_ENABLED=false`. Sign in.
8. Enter the HTTPS root of a domain you control, then select **Register domain**.
9. Publish the displayed DNS TXT record. DNS changes may take time to propagate.
10. Select **Verify DNS ownership**, then consent and run the read-only assessment.
11. Open assessment history to retrieve saved results.

The API binds to localhost and is not intended for public deployment. The database port is localhost-only in Compose. A real database password is required; this repository does not provision hosted infrastructure or secrets.

**Do not use real user data or production credentials in this research prototype.** Registration is not email-verified; additional security and end-to-end tests are required before any production use.
