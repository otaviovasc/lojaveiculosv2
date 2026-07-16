# Deploy Runbook

## Normal Flow

1. Merge feature work through a pull request.
2. Confirm Codex review has no unresolved P0/P1 findings.
3. Run `pnpm run release:verify` from a clean branch.
4. Merge or fast-forward the accepted commit to `staging`, then check it out.
5. Select the Railway `staging` environment and manually upload the API first,
   then the web and CRM schedule worker services from that exact checkout.
6. Wait for Railway staging API and web deployments to reach `SUCCESS`, then
   verify the first CRM worker cron execution exits successfully.
7. Run `pnpm run release:smoke:staging`.
8. Promote the exact accepted commit through a release PR into `main`.
9. From that exact `main` commit, select `production` and manually upload API,
   then web and the CRM schedule worker.
10. Wait for API and web production deployments to reach `SUCCESS`, then
    verify the first CRM worker cron execution exits successfully.
11. Run `pnpm run release:smoke:production`.
12. Watch Railway logs, HTTP metrics, and Sentry for the release window.

```bash
railway environment staging
railway up --service lojaveiculosv2-api --detach
railway up --service lojaveiculosv2-web --detach
railway up --service lojaveiculosv2-crm-schedule-worker --detach
```

Use the same commands with `railway environment production` only from the
accepted production commit.

## Railway Settings

- GitHub source autodeploy: disabled for both environments.
- Do not enable Wait for CI; this project does not use GitHub Actions.
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
- Upload only the app services included in the verified release; do not rebuild
  unchanged services automatically on every push.
- Prefer Railway serverless sleep for staging only after verifying that cold
  starts do not break smoke tests or provider callbacks.

## Agent Rules

Agents may inspect deploy status and logs. They must not mutate production
services, variables, domains, or databases unless the operator explicitly asks
for that exact mutation.
