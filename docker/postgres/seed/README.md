# Local product seed

`pnpm run db:reset` is the single from-scratch entry point. It recreates the
local databases and Redis, pushes schemas, builds the deterministic development
scenario, materializes configured test artifacts, checks the configured sandbox
services, and verifies the result. `pnpm run db:seed` remains the non-destructive
reseed used by that workflow. Both are local-only and fail before touching a
non-local database.

## Topology

| Account           | Store                 | Purpose                                                            |
| ----------------- | --------------------- | ------------------------------------------------------------------ |
| Grupo Horizonte   | `test-store`          | Full acquisition-to-cash workflow and every local login persona    |
| Grupo Horizonte   | `test-store-sorocaba` | Same-tenant multi-store and past-due/degraded entitlement behavior |
| Rota 27 Seminovos | `isolation-store`     | Foreign-tenant isolation and minimal trial behavior                |

The canonical browser/API personas keep their stable Clerk ids:

- `clerk_seed_agency`
- `clerk_seed_owner`
- `clerk_seed_supervisor`
- `clerk_seed_salesman`
- `clerk_test_investor`
- `clerk_platform_admin`

The seed also contains a branch salesperson, an independent-store owner, a
suspended former member, and a pending invitation. Stable ids and the
`test-store` slug are contracts for local E2E tests; visible names and business
facts should remain plausible fictional data.

## Structure and invariants

`product-test-user.sql` is a small manifest. It takes a transaction-scoped
advisory lock, includes the domain files in dependency order, runs
`90-invariants.sql`, and commits all product fixtures together. PostgreSQL
`now()` is transaction-stable, so every relative scenario date uses one clock.

Normal reseeding uses upserts and only removes obsolete rows with known seed
ids. It must not truncate or overwrite unrelated developer-created rows. The
separate `db:clean:local` command intentionally truncates both local databases
before reseeding.

`qa:seed:local` verifies tenant scope, accounts, permission overrides,
subscription/entitlement truth, inventory lifecycle, reservation and finance
graphs, documents, and provider truth. It runs automatically at the end of
`db:seed`. Eight published listings intentionally carry
`mediaScenario=missing_photos` to exercise the empty-gallery/degraded-content
state; only model-correct R2 media is attached.

## External systems

The SQL fixture never claims that an official provider operation succeeded.

- Z-API stores environment-variable names, not credentials. `db:reset` and
  `db:seed` check the same shared test instance read-only while the database row
  remains `sandbox`; no provider result is written around the service/audit
  path. Local conversations carry no provider ids or delivery evidence. Use
  `pnpm run crm:zapi:diagnose` explicitly when the instance needs pairing.
- Asaas rows use `local_*` placeholder ids and pending/overdue/cancelled states.
  The seed authenticates against the configured Asaas sandbox with a read-only
  customer-list request. It deliberately does not create a customer or
  subscription because repeated resets must not accumulate external resources.
  Use `pnpm run billing:asaas:sync-smoke` explicitly for a mutating rehearsal.
- Marketplace accounts are inactive/error and listings are not submitted.
- Fiscal rows are draft/validation-failed and explicitly say that no official
  operation occurred. RENAVE is intentionally unavailable and unseeded.
- R2 is only used to materialize deterministic document/media artifacts under
  fixed seed keys. Database URLs are rewritten from `R2_PUBLIC_BASE_URL` after
  successful materialization. When R2 is configured, `db:reset` requires
  `R2_SEED_WRITE_BUCKET` to exactly match `R2_BUCKET_NAME`; set it only for the
  dedicated disposable test bucket. A fresh bucket receives honest generated
  “photo in preparation” SVGs when the shared model-correct photo source is not
  present.
- Redis remains empty because it is ephemeral coordination, not product truth.
  The verifier PINGs the configured instance, or the local Docker instance when
  `REDIS_URL` is absent, but never flushes or seeds shared state.
- The audit database remains sink-only. Static SQL must not fabricate audit
  evidence; real service calls populate it through the audit sink.

Never replace provider-operation fixtures with `paid`, `issued`, `authorized`,
externally `published`, outbound `delivered`, or `succeeded` unless an explicit
sandbox rehearsal captured real provider evidence and persisted it through the
application path. Inbound CRM fixtures use runtime-canonical `DELIVERED` only
to mean that local ingestion completed; they contain no provider identifiers.
