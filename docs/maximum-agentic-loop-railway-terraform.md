# Maximum Agentic Loop With Codex, Railway, and Terraform

This is the operating guide for the Loja Veiculos V2 AI-assisted delivery loop.
It links to the concrete repo docs that agents and humans should use during
implementation, deployment, incident response, and continuous improvement.

## Target Loop

```text
signal -> issue -> reproduce -> regression test -> fix -> validate -> PR
  -> Codex review -> local release gate -> staging -> smoke tests
  -> operator production promotion -> monitor
```

The goal is high autonomy inside strong rails:

- Codex can inspect code, write tests, fix issues, run checks, and open PRs.
- The clean-commit local release gate is the objective validation gate.
- Railway builds and deploys; GitHub Actions is intentionally unused.
- Staging catches integration issues before production.
- Observability turns runtime failures into fixable issues.
- Humans approve high-risk production changes.

## Current Implementation Status

Implemented in this repo:

- Local commit, push, and release validation tiers
- Operator staging and production HTTP smoke commands
- API smoke script: `pnpm run test:smoke:api`
- Terraform scaffold for GitHub branch protection:
  `infra/terraform/`
- Deploy runbook: `docs/runbooks/deploy.md`
- Incident runbook: `docs/runbooks/incidents.md`
- Rollback runbook: `docs/runbooks/rollback.md`
- Environment variable catalog: `docs/ops/env-vars.md`
- Repo-specific agent workflow: `docs/agents/lojaveiculosv2-repo-skill.md`
- Project-local Codex skill stub: `.codex/skills/lojaveiculosv2-repo/SKILL.md`
- Railway target notes updated in `docs/railway.md`
- `AGENTS.md` points agents to the new operational docs
- `.gitignore` ignores Terraform working directories while keeping lock files
  versionable

Verified locally:

- Railway CLI is installed from Homebrew at `/opt/homebrew/bin/railway`.
- Railway CLI version: `5.13.3`.
- Railway MCP is configured in local stdio mode and uses the authenticated CLI.
- Railway authentication works for the current user.
- Terraform version: `1.15.6`.
- GitHub CLI version: `2.92.0`.
- `pnpm run validate` passes.
- `terraform fmt -check -recursive infra/terraform` passes.
- Terraform staging and production configs validate when provider execution is
  allowed outside the sandbox.
- The six-resource Railway staging topology was applied on 2026-07-16. Product
  Postgres, audit Postgres, and Redis reached `SUCCESS`; the API, web, and CRM
  cron services intentionally have no code deployment yet.

Still external/manual:

- Configure staging service variables and sealed secrets.
- Upload the verified API, web, and CRM worker commit to staging and run smoke
  checks.
- Apply the reviewed six-resource plan to production only after staging
  acceptance. Production is currently empty.
- Configure operator-local staging and production smoke URLs.
- Add Terraform modules for GitHub, DNS, Sentry, and uptime monitors.

## Railway Shape

Target Railway project:

```text
respectful-respect
  production
    lojaveiculosv2-api
    lojaveiculosv2-web
    lojaveiculosv2-crm-schedule-worker (Railway cron, every 5 minutes)
    product Postgres
    audit Postgres
    Redis
  staging
    same service shape with isolated variables and databases
```

Use accepted commits from `main` for production and `staging` for staging.
GitHub source autodeploy stays disabled; both environments use explicit manual
uploads after local verification. Redis is enabled for CRM realtime fanout and
replay. The only worker is the short-lived scheduled-message cron; PR
environments, permanent queue consumers, and speculative cron services remain
disabled until measured value justifies cost.

Railway healthcheck paths:

```text
API: /ready
Web: /health
```

The API exposes `/health` for liveness and `/ready` for bounded product/audit
database probes.

## Terraform Boundary

Use Railway-native tools for Railway resources:

- projects
- environments
- services
- databases
- variables
- domains
- deployments

Use Terraform for surrounding infrastructure:

- GitHub branch protection
- GitHub environment rules
- Cloudflare DNS
- Sentry projects and alerts
- uptime monitors
- notification routing

Do not use Terraform as the main Railway deploy mechanism unless a real
provider or internal abstraction exists. Avoid long-term `local-exec` workflows
for Railway because they weaken state and error handling.

## Source Of Truth Docs

Use these docs instead of duplicating instructions:

- Agent workflow: `docs/agents/lojaveiculosv2-repo-skill.md`
- Repo architecture: `docs/architecture.md`
- Repo organization: `docs/repo-organization.md`
- Railway setup: `docs/railway.md`
- Production readiness: `docs/production-readiness.md`
- Env vars: `docs/ops/env-vars.md`
- Deploy runbook: `docs/runbooks/deploy.md`
- Incident runbook: `docs/runbooks/incidents.md`
- Rollback runbook: `docs/runbooks/rollback.md`

## Autonomy Policy

Allowed automatically:

- read and edit repo files
- add focused tests
- run `pnpm run validate`
- inspect bounded non-secret logs
- open PRs
- comment on issues

Require explicit approval:

- production deploy mutation
- production database migration
- Railway variable changes
- secret changes
- DNS changes
- destructive database operations
- deleting services or environments
- broad dependency upgrades

Prohibited unless specifically requested:

- committing secrets
- disabling tests to pass CI
- weakening auth or permissions
- changing production config without an issue
- merging directly to `main`

## Daily Operating Flow

1. Review failed local release gates, failed deploys, and production errors.
2. Group failures by service, deployment, commit, and fingerprint.
3. Create an issue with sanitized evidence.
4. Ask Codex to reproduce, add a regression test, fix, and validate.
5. Review the PR through Codex review and human review where needed.
6. Merge to staging, smoke test, then promote to production.
7. Watch the same fingerprint after deploy.
8. Update tests, docs, `AGENTS.md`, or runbooks if the mistake can repeat.

## Validation

Run from repo root:

```bash
pnpm run validate
pnpm run test:smoke:api
pnpm run release:verify
```

If full validation is too expensive during an investigation, run the narrowest
workspace checks first and finish with `pnpm run validate` before handoff.
