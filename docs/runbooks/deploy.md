# Deploy Runbook

## Normal Flow

1. Merge feature work through a pull request.
2. Confirm `CI` passes.
3. Confirm Codex review has no unresolved P0/P1 findings.
4. Merge to `staging`.
5. Wait for Railway staging deploy.
6. Run staging smoke checks.
7. Promote through a release PR into `main`.
8. Wait for Railway production deploy.
9. Run production smoke checks.
10. Watch Railway logs, HTTP logs, metrics, and Sentry for the release window.

## Railway Settings

- Staging service branch: `staging`.
- Production service branch: `main`.
- Enable Railway Wait for CI.
- Healthcheck path: `/health`.
- API service start command: `pnpm --filter @lojaveiculosv2/api start` or the Railway-detected equivalent for the API service root.
- Web service build/start depends on the selected Railway strategy. Do not deploy `apps/web/dist` as a committed artifact.

## Pre-Deploy Checklist

- `pnpm run validate` passes locally or in CI.
- Database migrations are backward-compatible.
- New variables are documented in `docs/ops/env-vars.md`.
- Rollback notes exist for risky changes.
- Production secrets were not printed in logs, PRs, or chat.

## Post-Deploy Checks

```bash
curl --fail "$API_BASE_URL/health"
```

Also verify:

- Railway deployment is active.
- No new 5xx burst in HTTP logs.
- No crash loop in deployment logs.
- Sentry release has no new high-frequency exception.
- Critical public storefront route loads.

## Agent Rules

Agents may inspect deploy status and logs. They must not mutate production
services, variables, domains, or databases unless the operator explicitly asks
for that exact mutation.
