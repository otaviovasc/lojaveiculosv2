# Railway

Railway is the primary deploy target for V2.

## Target Project

The target is the Railway project `respectful-respect`
(`fcb43bc7-1d5d-40c2-96cd-420f34d99b5b`) with isolated `production` and
`staging` environments.

Staging declares the API, web, CRM schedule worker, billing reconciliation
worker, billing product-event worker, product Postgres, audit Postgres, and
Redis. Production remains empty.

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

Meta webhook verification is API-only. `CRM_META_APP_SECRET` and
`CRM_META_WEBHOOK_VERIFY_TOKEN` are shared staging secrets referenced by the API
service, but they are intentionally not copied to the CRM schedule worker. The
worker sends scheduled messages through Composio and does not receive Meta
webhooks.

The web service receives `VITE_API_BASE_URL` from the API service's
`API_BASE_URL` reference, so browser requests cannot silently fall back to the
web service's SPA route and parse `index.html` as an API response.

Staging currently retains explicit `keepme_*` placeholders only for capabilities
that are not ready to receive provider callbacks:

- Official Meta inbound messaging: `CRM_META_APP_SECRET` and
  `CRM_META_WEBHOOK_VERIFY_TOKEN`. Replace both before registering the shared
  Meta webhook at
  `https://lojaveiculosv2-api-staging.up.railway.app/api/v1/crm/webhooks/meta`.
  The verification token must match the value entered in Meta.
- Instagram customer onboarding also requires
  `COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID` and an explicit
  `COMPOSIO_INSTAGRAM_LOGIN_MODE` (`facebook` or `instagram`) on the API
  service. Keep the WhatsApp and Instagram auth-config IDs distinct.
- Deferred storefront DNS: `PUBLIC_STOREFRONT_ROOT_DOMAIN` and
  `PUBLIC_STOREFRONT_CUSTOM_DOMAIN_CNAME_TARGET`.

Core launch, Z-API, Composio, OpenRouter, Asaas, SPEDY, R2, Clerk, marketplace,
and financing values must remain real staging values. Z-API webhook
authentication uses server-generated per-connection secrets, not a shared
Railway variable. Do not place real secrets in `.railway/railway.ts`; maintain
them as sealed Railway shared variables.

Each persistent environment should contain:

- `lojaveiculosv2-web`
- `lojaveiculosv2-api`
- `lojaveiculosv2-crm-schedule-worker`
- `lojaveiculosv2-billing-reconciliation-worker`
- `lojaveiculosv2-billing-product-event-worker`
- `lojaveiculosv2-crm-retention-worker`
- product Postgres
- audit Postgres
- Redis

Redis supports CRM conversation SSE tickets, fanout, and bounded replay across API
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
- API startup applies the migration chain, reconciles the immutable
  server-owned billing catalog, then starts HTTP. Catalog reconciliation is
  idempotent, serialized with a Postgres advisory lock, and fails the deploy on
  definition drift rather than overwriting an existing version.
- API deployment overlap is explicitly zero. The old revision stops before the
  new revision can activate a catalog, trading a short deploy interruption for
  a guarantee that two binary versions cannot serve different active-catalog
  contracts concurrently.
- Web deployment healthcheck path: `/health`.
- CRM schedule worker: `*/5 * * * *` UTC; no HTTP healthcheck because each run
  must terminate.
- Billing reconciliation worker: `*/5 * * * *` UTC; it claims durable billing
  tasks and exits. Provider writes occur only during scheduled executions,
  never during build or deploy.
- Billing product-event worker: `*/5 * * * *` UTC with restart policy `NEVER`;
  it delivers the durable product-event outbox to the configured HTTPS sink and
  exits. Sink URL/token stay sealed on that service.
- Marketplace reconciliation remains deferred until its worker is explicitly
  approved for provisioning; it is not part of the current Railway plan.
- CRM retention worker: `17 * * * *` UTC with restart policy `NEVER`. The first
  staging release is pinned to `CRM_RETENTION_DRY_RUN=true`; it reports scoped
  eligibility and legal-hold skips without anonymizing or purging CRM data.
- Catalog publication is not provider reconciliation: it may install and
  activate catalog definition rows during API startup, but it never changes
  subscription items, provider subscriptions, invoices, or payments.
- `/health` is liveness; `/ready` verifies product and audit database access.
- Treat Redis loss as a degraded CRM realtime state rather than making the
  entire API unready; Postgres remains the durable message source of truth.
- Apply `.railway/railway.ts` only after reviewing `railway config plan`.
- Keep production Railway operations read-only from agent sessions unless the
  operator explicitly asks for a specific mutation.

## Reference Docs

- Full loop: `docs/maximum-agentic-loop-railway-terraform.md`
- Deploy runbook: `docs/runbooks/deploy.md`
- CRM retention runbook: `docs/runbooks/crm-retention.md`
- Basic V1 to V2 migration runbook:
  `docs/runbooks/v1-to-v2-basic-migration.md`
- Incident runbook: `docs/runbooks/incidents.md`
- Rollback runbook: `docs/runbooks/rollback.md`
- Non-production reset runbook:
  `docs/runbooks/reset-non-production-environment.md`
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
