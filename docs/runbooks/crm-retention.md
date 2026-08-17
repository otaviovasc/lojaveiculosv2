# CRM Retention Worker Runbook

## Purpose And Safety State

The `lojaveiculosv2-crm-retention-worker` is an isolated Railway cron that
discovers due store scopes from the product database, evaluates the CRM
retention policy, writes audit evidence to the separate audit database, and
exits. It runs hourly at minute 17 UTC so failed or truncated scopes can be
retried without waiting a full day.

The first staging release is observation-only. Railway must keep
`CRM_RETENTION_DRY_RUN=true`; eligible rows are counted, but no CRM content is
anonymized or purged. Do not override this variable in the dashboard because
`.railway/railway.ts` is the desired-state source of truth.

## Runtime Contract

- Start command: `pnpm --filter @lojaveiculosv2/api crm:retention:process`
- Cron: `17 * * * *` UTC
- Restart policy: `NEVER`
- Product state: `DATABASE_URL` references product Postgres directly.
- Audit evidence: `AUDIT_DATABASE_URL` references audit Postgres directly.
- Credential material: `CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY` references
  the API variable and must never be copied as a literal.
- Scheduled global runs leave `CRM_RETENTION_TENANT_ID` and
  `CRM_RETENTION_STORE_ID` unset.
- Before claiming any scope or audit-outbox row, the worker probes both
  databases with bounded backoff so a fresh Railway cron container does not
  fail on transient private-network readiness.

The process logs only aggregate counters and identifiers needed for scoped
operations. Never add message bodies, provider payloads, credentials, or raw
database rows to its logs.

## First Staging Release

1. Review `railway config plan --environment staging`; confirm one isolated
   service is added, the schedule is under `deploy.cronSchedule`, both database
   values are resource references, the encryption key is a service reference,
   and `CRM_RETENTION_DRY_RUN` is exactly `true`.
2. Apply only after operator approval of that exact plan and promote through
   the normal staging release flow.
3. Confirm the cron deployment reaches `SUCCESS` and the process terminates.
4. In bounded Railway logs, find `job.crm_retention.completed` and verify:
   `dryRun: true`, `failedScopes: 0`, `blockedScopes: 0`, and an expected,
   bounded `eligibleCount`.
5. Confirm audit delivery is healthy: `auditFailed` must be `0`. Investigate
   an increasing product audit outbox backlog before any live enablement.
6. Observe at least one full retention window (24 hours) and record eligible,
   legal-hold-skipped, truncated, and failed scope counts for the release.

Exit code `0` means the run completed without blocked or failed scopes. Exit
code `2` means one or more scopes were blocked or failed. Exit code `1` means
startup or unhandled execution failure. Because the restart policy is `NEVER`,
Railway does not turn a failed short-lived run into a restart loop.

## Live Enablement Gate

Do not enable destructive retention as part of the first staging release. A
later change from `CRM_RETENTION_DRY_RUN=true` to `false` requires all of:

- explicit operator approval of the reviewed IaC plan;
- a current recoverable product database backup;
- verified legal-hold tables and expected held-row counts;
- zero blocked/failed scopes and zero audit-delivery failures during the
  observation window;
- review of eligible counts against the documented retention policy and legacy
  reconciliation coverage;
- a bounded tenant/store rehearsal before a global scheduled run.

Only the exact value `false` enables mutations. Make the change in
`.railway/railway.ts`, not as dashboard drift, and repeat the plan review before
apply. Production remains dry-run until staging live execution has separate,
explicit acceptance.

## Failure And Recovery

- Missing product or audit database configuration fails startup closed.
- Missing legal-hold storage blocks the affected retention evaluation; do not
  bypass it.
- `failedScopes` or `blockedScopes` greater than zero: keep dry-run enabled,
  inspect sanitized logs by request/store/tenant identifier, and resolve the
  policy, schema, or database issue.
- `auditFailed` greater than zero: keep dry-run enabled and restore audit
  database delivery. Durable product audit-outbox rows are retried by later
  executions.
- Unexpected eligible volume: keep dry-run enabled and verify timestamps,
  closed-cycle criteria, legal holds, and legacy coverage before proceeding.
- To stop evaluation while investigating, remove or disable the cron only
  through a reviewed Railway IaC plan. No database rollback is needed for
  dry-run executions because they do not anonymize or purge content.
