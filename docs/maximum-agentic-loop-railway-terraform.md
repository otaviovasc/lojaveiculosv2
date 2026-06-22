# Maximum Agentic Loop With Codex, Railway, and Terraform

This is the operating guide for the Loja Veiculos V2 AI-assisted delivery loop.
It links to the concrete repo docs that agents and humans should use during
implementation, deployment, incident response, and continuous improvement.

## Target Loop

```text
signal -> issue -> reproduce -> regression test -> fix -> validate -> PR
  -> CI -> Codex review -> staging -> smoke tests -> production -> monitor
```

The goal is high autonomy inside strong rails:

- Codex can inspect code, write tests, fix issues, run checks, and open PRs.
- GitHub Actions is the objective validation gate.
- Railway deploys only after CI passes.
- Staging catches integration issues before production.
- Observability turns runtime failures into fixable issues.
- Humans approve high-risk production changes.

## Current Implementation Status

Implemented in this repo:

- CI workflow: `.github/workflows/ci.yml`
- Staging smoke workflow: `.github/workflows/staging-smoke.yml`
- Production smoke workflow: `.github/workflows/production-smoke.yml`
- API smoke script: `npm run test:smoke:api`
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
- Railway agent tooling is healthy.
- Railway authentication works for the current user.
- Terraform version: `1.15.6`.
- GitHub CLI version: `2.92.0`.
- `npm run validate` passes.
- `terraform fmt -check -recursive infra/terraform` passes.
- Terraform staging and production configs validate when provider execution is
  allowed outside the sandbox.

Still external/manual:

- Create the new Railway project.
- Create `production` and `staging` Railway environments.
- Connect Railway services to the GitHub repo.
- Enable Railway Wait for CI.
- Enable Railway PR environments.
- Configure service variables and sealed secrets.
- Add GitHub secrets for `STAGING_API_BASE_URL` and `PRODUCTION_API_BASE_URL`.
- Add Terraform modules for GitHub, DNS, Sentry, and uptime monitors.

## Railway Shape

Target Railway project:

```text
loja-v2
  production
    lojaveiculosv2-api
    lojaveiculosv2-web
    product Postgres
    audit Postgres
    Redis if needed
  staging
    same service shape with isolated variables and databases
  PR environments
    temporary validation environments for pull requests
```

Use `main` for production and `staging` for staging. Enable Wait for CI so a
failed GitHub workflow skips deployment.

Railway healthcheck path:

```text
/health
```

The API already exposes `/health` in
`apps/api/src/infrastructure/http/createApp.ts`.

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
- run `npm run validate`
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

1. Review failed CI, failed deploys, and production errors.
2. Group failures by service, deployment, commit, and fingerprint.
3. Create an issue with sanitized evidence.
4. Ask Codex to reproduce, add a regression test, fix, and validate.
5. Review the PR through CI, Codex review, and human review where needed.
6. Merge to staging, smoke test, then promote to production.
7. Watch the same fingerprint after deploy.
8. Update tests, docs, `AGENTS.md`, or runbooks if the mistake can repeat.

## Validation

Run from repo root:

```bash
npm run validate
npm run test:smoke:api
```

If full validation is too expensive during an investigation, run the narrowest
workspace checks first and finish with `npm run validate` before handoff.
