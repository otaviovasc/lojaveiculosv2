# Railway

Railway is the primary deploy target for V2.

## Target Project

The target is the Railway project `respectful-respect`
(`fcb43bc7-1d5d-40c2-96cd-420f34d99b5b`) with isolated `production` and
`staging` environments.

As of 2026-07-16, staging contains the six declared resources. Product
Postgres, audit Postgres, and Redis are running successfully; API, web, and the
CRM cron service exist without code deployments. Production remains empty.

Staging public domains are:

- API: `https://lojaveiculosv2-api-staging.up.railway.app`
- Web: `https://lojaveiculosv2-web-staging.up.railway.app`

Staging runtime values are linked instead of copied:

```text
Railway staging shared variables ──> API ──> CRM schedule worker
                                 └─> web VITE_* build variables
product Postgres ──────────────────> API + worker
audit Postgres ────────────────────> API + worker
Redis ─────────────────────────────> API + worker
```

The worker intentionally references the API runtime variables so Clerk, R2,
Z-API, billing, fiscal, routing, and observability configuration cannot drift
between the two processes. Database and Redis URLs remain direct typed
references to their Railway resources. `railway config plan` reported zero
drift after this wiring was applied.

The following staging shared variables contain explicit `keepme_*` or
`keepme-*.invalid` placeholders and must be replaced in Railway before the
corresponding capability is enabled:

- Core launch: `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`,
  `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`,
  `R2_PUBLIC_BASE_URL`, and `MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY`.
- CRM WhatsApp: `CRM_ZAPI_CLIENT_TOKEN` and `CRM_ZAPI_WEBHOOK_TOKEN`.
- Asaas sandbox: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`, and
  `ASAAS_RUNTIME_IMPLEMENTATION`. Set the implementation to `http` only after
  the other values are real.
- SPEDY: `SPEDY_API_URL`, `SPEDY_API_TOKEN`, `SPEDY_ISSUE_PATH`,
  `SPEDY_CANCEL_PATH`, `SPEDY_STATUS_PATH`, `SPEDY_WEBHOOK_SECRET`, and
  `SPEDY_RUNTIME_IMPLEMENTATION`. Set the implementation to `http` only after
  the authorized integrator contract is complete.
- Deferred storefront DNS: `PUBLIC_STOREFRONT_ROOT_DOMAIN` and
  `PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET`.

Asaas and SPEDY remain fail-closed while their implementation variables retain
placeholder values. Do not deploy with a core-launch placeholder. Do not place
real secrets in `.railway/railway.ts`; replace them in Railway's staging shared
variable settings.

Each persistent environment should contain:

- `lojaveiculosv2-web`
- `lojaveiculosv2-api`
- `lojaveiculosv2-crm-schedule-worker`
- product Postgres
- audit Postgres
- Redis

Redis supports CRM WhatsApp SSE tickets, fanout, and bounded replay across API
instances. The in-process broker remains the explicit degraded fallback when
Redis is unavailable. The scheduled-message worker runs as a short-lived
Railway cron every five minutes and exits after processing due Postgres-backed
schedules. Railway buckets, PR environments, permanent queue consumers, extra
workers, and transitional V1 services remain opt-in. Audit Postgres remains
separate because audit isolation is a product invariant, not optional capacity.

## Deployment Rules

- GitHub hosts source, reviews, and the `main-source-guard` check that only
  allows PRs into `main` from `staging`; quality gates stay local in the
  pre-commit and pre-push hooks.
- GitHub source autodeploy is enabled per environment: the `staging`
  environment tracks the `staging` branch and `production` tracks `main`,
  declared in `.railway/railway.ts`.
- A push to the environment branch deploys. Promote with
  `pnpm run release:staging` after `release:verify` passes, then smoke test
  staging before opening the release PR with `pnpm run release:promote`. The
  explicit `railway up --service ...` sequence in `docs/runbooks/deploy.md`
  remains a break-glass path.
- Keep PR environments disabled until their feedback value justifies Railway
  usage.
- API deployment healthcheck path: `/ready`.
- Web deployment healthcheck path: `/health`.
- CRM schedule worker: `*/5 * * * *` UTC; no HTTP healthcheck because each run
  must terminate.
- `/health` is liveness; `/ready` verifies product and audit database access.
- Treat Redis loss as a degraded CRM realtime state rather than making the
  entire API unready; Postgres remains the durable message source of truth.
- Apply `.railway/railway.ts` only after reviewing `railway config plan`.
- Keep production Railway operations read-only from agent sessions unless the
  operator explicitly asks for a specific mutation.

## Reference Docs

- Full loop: `docs/maximum-agentic-loop-railway-terraform.md`
- Deploy runbook: `docs/runbooks/deploy.md`
- Basic V1 to V2 migration runbook:
  `docs/runbooks/v1-to-v2-basic-migration.md`
- Incident runbook: `docs/runbooks/incidents.md`
- Rollback runbook: `docs/runbooks/rollback.md`
- Variables: `docs/ops/env-vars.md`

## MCP

Local setup:

```bash
railway login
railway mcp install --agent codex
```

Restart Codex after installation.

The project-level desired state lives in `.railway/railway.ts`. Terraform owns
only surrounding infrastructure such as GitHub branch rules, DNS, Sentry, and
uptime monitoring.
