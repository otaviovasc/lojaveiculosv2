# Deploy Runbook

## Normal Flow

1. Merge feature work through a pull request into a feature branch.
2. Confirm Codex review has no unresolved P0/P1 findings.
3. From the feature branch, run `pnpm run release:staging`. This runs
   `release:verify`, merges the branch into `staging`, and pushes it.
4. Pushing `staging` triggers the Railway staging auto-deploy (GitHub source,
   branch `staging`) for the API, web, and CRM schedule worker services.
5. Wait for the staging API and web deployments to reach `SUCCESS`, then
   verify the first CRM worker cron execution exits successfully.
6. Run `pnpm run release:smoke:staging` and test the flows on staging.
7. Run `pnpm run release:promote` to open the `staging` -> `main` release PR.
   The `main-source-guard` check only allows PRs into `main` from `staging`.
8. Merge the release PR. The push to `main` triggers the Railway production
   auto-deploy (GitHub source, branch `main`).
9. Wait for API and web production deployments to reach `SUCCESS`, then
   verify the first CRM worker cron execution exits successfully.
10. Run `pnpm run release:smoke:production`.
11. Watch Railway logs, HTTP metrics, and Sentry for the release window.

Manual uploads with `railway up --service <name> --detach` remain available
as a break-glass path when the GitHub auto-deploy is unhealthy.

## Railway Settings

- GitHub source autodeploy: enabled per environment. The `staging` environment
  deploys from the `staging` branch; `production` deploys from `main`. Service
  sources are declared in `.railway/railway.ts`.
- Pull requests into `main` must come from `staging`; enforced by the
  `main-source-guard` GitHub Actions check plus branch protection. A pre-push
  hook blocks local pushes to `main` that bypass `staging`.
- Wait for CI stays disabled; quality gates run locally via the pre-commit and
  pre-push hooks, and staging is verified before promotion.
- API build: `pnpm --filter @lojaveiculosv2/api build`.
- API start: `pnpm run db:migrate:deploy && pnpm --filter @lojaveiculosv2/api start`.
- API healthcheck: `/ready`.
- Web build: `pnpm --filter @lojaveiculosv2/web build`.
- Web start: `pnpm --filter @lojaveiculosv2/web start`.
- Web healthcheck: `/health`.
- CRM schedule worker build: `pnpm --filter @lojaveiculosv2/api build`.
- CRM schedule worker start: `pnpm run crm:whatsapp:schedule:process`.
- CRM schedule worker cron: `*/5 * * * *` UTC. It must close database, audit,
  Redis, and storage clients and exit; an active prior run causes Railway to
  skip the next occurrence.
- Configure the worker with the API's Clerk, R2, Z-API, product DB, audit DB,
  and Redis runtime variables before enabling live sends.
- Keep the full monorepo as build context because both apps import workspace
  packages. Do not commit `apps/web/dist`.

## Pre-Deploy Checklist

- `pnpm run release:verify` passes from the exact commit being deployed.
- Database migrations are backward-compatible.
- New variables are documented in `docs/ops/env-vars.md`.
- Rollback notes exist for risky changes.
- Production secrets were not printed in logs, PRs, or chat.

## Post-Deploy Checks

```bash
curl --fail "$API_BASE_URL/health"
curl --fail "$API_BASE_URL/ready"
curl --fail "$WEB_BASE_URL/health"
```

Also verify:

- Railway deployment is active.
- No new 5xx burst in HTTP logs.
- No crash loop in deployment logs.
- Redis is reachable from the API and CRM realtime reconnect/replay succeeds.
- The CRM schedule worker's most recent cron execution succeeded and no due
  schedule backlog is growing.
- Sentry release has no new high-frequency exception.
- Critical public storefront route loads.

## Cost Controls

- Keep one replica per persistent app service until measured load requires more.
- Keep one Redis service and one short-lived CRM cron worker per persistent
  environment. Do not add permanent consumers or extra cron services without a
  measured backlog or reliability requirement.
- Keep PR environments and Railway buckets disabled by default.
- Upload only the app services included in the verified release; pushes to the
  environment branch redeploy all app services, so batch changes into one
  verified promotion instead of many small pushes.
- Prefer Railway serverless sleep for staging only after verifying that cold
  starts do not break smoke tests or provider callbacks.

## Agent Rules

Agents may inspect deploy status and logs. They must not mutate production
services, variables, domains, or databases unless the operator explicitly asks
for that exact mutation.
