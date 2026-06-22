# Loja Veiculos V2 Repo Skill

This is the compact repo-specific workflow that agents should load when doing
non-trivial work in `lojaveiculosv2/`.

## When To Use

Use this workflow for:

- feature work
- bug fixes
- production-readiness work
- Railway deployment work
- CI/CD changes
- architecture changes
- security or permission-sensitive changes
- incident follow-up

For tiny typo-only edits, `AGENTS.md` is enough.

## Required First Reads

Read these before changing behavior:

1. `AGENTS.md`
2. `docs/repo-organization.md`
3. `docs/architecture.md`

Read these when relevant:

- Railway/deploys: `docs/railway.md`, `docs/runbooks/deploy.md`
- Production readiness: `docs/production-readiness.md`
- Env vars: `docs/ops/env-vars.md`
- Incidents: `docs/runbooks/incidents.md`
- Rollback: `docs/runbooks/rollback.md`
- Agentic loop: `docs/maximum-agentic-loop-railway-terraform.md`

## Default Loop

1. Understand the target domain and file ownership.
2. Make the smallest behavior-preserving or behavior-changing edit that satisfies the task.
3. Add or update focused tests when behavior changes.
4. Run the narrowest useful check first.
5. Run `npm run validate` before handoff when feasible.
6. Update docs when commands, env vars, deploy behavior, or operational rules change.

## Non-Negotiables

- Controllers route, parse, authorize, call services, and map responses. They do not hold business rules.
- Domain services do not import HTTP, Railway, Clerk, Drizzle, Pino, provider SDKs, or framework adapters.
- Service entrypoints receive explicit `ServiceContext`.
- Permission and entitlement checks are explicit.
- Relevant user actions and integration events emit audit events.
- Logs are structured and scoped; no secrets or raw customer data.
- Production Railway access is read-only unless the user explicitly asks for mutation.

## Validation

Prefer this order:

```bash
npm run test --workspace <workspace> -- <focused-pattern>
npm run typecheck --workspace <workspace>
npm run lint --workspace <workspace>
npm run validate
```

If `npm run validate` cannot run, report which narrower checks ran and why full
validation was skipped.
