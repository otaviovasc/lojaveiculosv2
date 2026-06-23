---
name: lojaveiculosv2-repo
description: Use when working in the Loja Veiculos V2 repository on feature work, bug fixes, CI/CD, Railway deployment, production readiness, incidents, permissions, audit, or architecture-sensitive changes.
---

# Loja Veiculos V2 Repo

Follow `AGENTS.md` first. Then use `docs/agents/lojaveiculosv2-repo-skill.md`
as the repo workflow index.

Core reads:

1. `AGENTS.md`
2. `docs/repo-organization.md`
3. `docs/architecture.md`

Relevant reads:

- Railway/deploys: `docs/railway.md`, `docs/runbooks/deploy.md`
- Production readiness: `docs/production-readiness.md`
- Env vars: `docs/ops/env-vars.md`
- Incidents: `docs/runbooks/incidents.md`
- Rollback: `docs/runbooks/rollback.md`
- Agentic loop: `docs/maximum-agentic-loop-railway-terraform.md`

Default validation:

```bash
pnpm run validate
```

Production Railway access is read-only unless the user explicitly asks for the
specific mutation.
