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

Deploy the code first, then open a shell for the staging API service. Run the
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
