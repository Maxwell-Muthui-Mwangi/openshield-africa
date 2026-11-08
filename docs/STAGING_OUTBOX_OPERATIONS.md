# Private staging email worker operations

This is an opt-in staging deployment template, **not an actual deployment**.

## Prerequisites
- Private Linux staging VM with Node 22, an isolated PostgreSQL database, restricted outbound access to the approved SMTP server and no publicly reachable scanner.
- Create a dedicated unprivileged `openshield` system account and an `/opt/openshield` checkout.
- Store `DATABASE_URL`, `DB_MODE`, `DATABASE_SSL`, `OUTBOX_ENCRYPTION_KEY`, SMTP variables, `APP_ORIGIN`, `OUTBOX_WORKER_ENABLED=true` and `OUTBOX_POLL_MS=5000` in root-controlled `/etc/openshield/staging.env`. Permissions must restrict access to authorized administrators and the service account.
- Apply migrations against **staging only** using `npm run db:migrate`. Back up first.

## Start and supervise
Review `deploy/systemd/openshield-outbox-staging.service` against your actual host paths, account and hardening policy. Install it into `/etc/systemd/system`, then run:
```sh
sudo systemctl daemon-reload
sudo systemctl enable --now openshield-outbox-staging
sudo systemctl status openshield-outbox-staging
sudo journalctl -u openshield-outbox-staging --since '1 hour ago'
```
The daemon polls every 5 seconds by default, handles SIGTERM/SIGINT after the current batch, and systemd restarts unexpected failures. Its logs contain only job counts, status metrics and sanitized error codes; no message bodies.

## Staging acceptance checks
1. Run `npm run smtp:verify` against a provider-controlled SMTP endpoint.
2. Queue a verification email to an owned test mailbox and confirm receipt, expiration and single-use behavior.
3. Temporarily block SMTP egress and verify retry backoff and eventual dead-letter state; restore connectivity.
4. Terminate the worker during a controlled test and verify restart and expired lease recovery.
5. Verify queue age, error counts and sent/dead counts through restricted logs/metrics.
6. Test backup/restore and encryption key recovery in a disposable staging environment.

## Important limitations
- No staging VM, Neon instance, SMTP account, supervisor or alerting service has been connected or deployed by this PR.
- The daemon logs counts but does not yet export a Prometheus endpoint or send alerts. Monitoring requires external collection.
- This worker is explicitly blocked when `NODE_ENV=production`.
- A two-minute lease can expire while SMTP delivery is still in progress; at-least-once delivery may duplicate messages. Configure SMTP timeouts and worker concurrency before production.
- Keys require a planned rotation process and secure backup; never log or commit them.
- The systemd template is an example and requires a host-specific review of filesystem, credentials and outbound firewall policy.
- Public deployment remains prohibited pending independent security review.
