# Encrypted PostgreSQL email outbox — draft

The registration, verification resend and password recovery routes now atomically insert a hashed one-time token and encrypted email job in PostgreSQL. HTTP requests do not wait for SMTP. The worker claims jobs with `FOR UPDATE SKIP LOCKED`, attempts delivery, schedules exponential retries (up to 5 attempts), and marks exhausted or expired jobs `dead`.

## Configuration

Generate a dedicated random 32-byte key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it **only in the server's secret manager** as `OUTBOX_ENCRYPTION_KEY` (64 hex characters). Do not put the key in GitHub or frontend Vite variables. Losing the key makes queued messages unrecoverable; rotating it requires a controlled versioned migration.

Run `npm run db:migrate` to apply `006_email_outbox.sql`. Set SMTP credentials securely. To process a batch, set `OUTBOX_WORKER_ENABLED=true` and run `npm run outbox:run` in an isolated background process. A scheduler/supervisor must invoke the one-shot worker repeatedly; **this repository does not yet deploy a continuous worker**. The worker should have minimal DB permissions and network egress only to the approved SMTP endpoint.

## Security and operational notes

- AES-256-GCM encrypts recipient, subject and token-bearing message text at rest; the database stores IV and authentication tag separately. PostgreSQL backups contain ciphertext, not the encryption key.
- The token hash and queued email job are created in the same transaction. Resending deletes pending obsolete jobs and invalidates previous tokens.
- On successful SMTP acceptance, the worker removes encrypted payload bytes. This is not proof of inbox delivery.
- A crashed worker's lease can expire and be reclaimed. **At-least-once delivery** means duplicates are possible if SMTP accepts mail but acknowledgement is lost.
- Expired or exhausted jobs become dead-letter records. Investigate delivery metrics without exposing token-bearing payloads.
- A worker can claim a message just before token rotation; an obsolete verification link may be delivered but will be rejected by the API.
- Do not log plaintext message bodies or authentication links. Restrict DB reads, logs, backups and secret access.
- A real SMTP provider has not been connected or tested. CI uses an injected fake sender and disposable PostgreSQL.
- Additional work required: robust worker supervision, encryption key rotation, outbox metrics and alerting, delivery bounce handling, dead-letter reprocessing policy, trusted proxy and independent security review.

This feature remains a **draft**, not approved for public deployment.
