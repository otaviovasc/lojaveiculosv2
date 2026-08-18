# Reset Non-Production Environment

Use this one-time operator job to empty a local or staging environment while
keeping the heavy FIPE catalog. It resets:

- every product Postgres `public` table, except `vehicle_catalog_*`;
- audit Postgres data;
- the selected Redis database with `FLUSHDB`;
- every R2 object below the exact environment prefix (`l/` or `s/`).

The product reset recreates the current server-owned billing catalog, role
templates, and permission projection after truncation. It does not delete
Clerk users or sessions. On the next authenticated request, the API recreates
the V2 user from Clerk and routes an account without a store through
onboarding.

Production is blocked by both `APP_ENV` and Railway environment signals. The
R2 reset accepts only `l/` or `s/`; it cannot target `p/` or the bucket root.
The product and audit URLs must also resolve to different databases.

## Staging Railway Shell

For an ordinary reset, deploy the reset job first. For a fail-fast schema
cutover whose migration requires empty tables—such as canonical CRM migration
`0058`—reverse that order: run the already-deployed reset job before releasing
the migration. Otherwise Railway runs migrations during startup and the new
deployment correctly fails before a post-deploy reset can execute.

Open a shell for the currently healthy staging API service and run the
inspection:

```bash
pnpm --filter @lojaveiculosv2/api ops:reset-environment
```

It is a dry run by default and reports only counts and prefixes. If the output
shows `environment=staging` and `prefix=s/`, apply it once:

```bash
pnpm --filter @lojaveiculosv2/api ops:reset-environment --apply --confirm=staging
```

The job is idempotent. If a later phase fails after an earlier phase succeeds,
fix the external dependency and run the same apply command again.

For migration `0058`, confirm the second dry run reports zero rows in the CRM
conversation, connection, outbound, campaign-recipient, and lead-outcome
tables. Only then run the staging release. Do not recreate a store or reconnect
a provider between the reset and the successful migration deployment.

## Local

With local Postgres, audit Postgres, Redis, R2 credentials, and
`APP_ENV=local` configured:

```bash
pnpm --filter @lojaveiculosv2/api ops:reset-environment
pnpm --filter @lojaveiculosv2/api ops:reset-environment -- --apply --confirm=local
```

## Verification

After the staging apply:

1. Run the dry-run command again. Product users/tenants/stores, audit rows,
   Redis keys, and `s/` R2 objects should report empty. The small baseline
   billing/role rows remain, and `vehicle_catalog_*` row counts should remain
   populated.
2. Run `pnpm run release:smoke:staging`.
3. Sign in with an existing Clerk account. The API should recreate its V2 user
   and send it to onboarding.
4. Re-import only the backed-up tables you intend to keep. Any imported R2
   storage key must already begin with `s/`.

Legacy root prefixes such as `crm/`, `generated/`, `seed/`, and `tenants/`
are outside the new environment namespace. Delete them manually only during
the one-time cutover; the reset job intentionally never touches the bucket
root.
