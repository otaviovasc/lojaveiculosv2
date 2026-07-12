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

If `codebase-memory-mcp` tools are available in the active agent surface, use
them before broad manual repository scans. Index or search the current checkout
to find ownership, references, and call paths, and refresh the index after
meaningful feature-flow or file-organization changes.

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
5. Run `pnpm run validate` before handoff when feasible.
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
pnpm --filter <workspace> test -- <focused-pattern>
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm run validate
```

Validation tiers are explicit: `validate:commit` is for pre-commit,
`validate:push` is the full local gate, `validate:ci` adds enforced workspace
coverage plus production builds for both deployable apps, and `validate` aliases
`validate:push`. New `check:*` guardrails must be added to
`validate:core-guardrails`; `check:validation` enforces that wiring. Add checker
regressions under `tools/quality/*.test.mjs`, which are mandatory through
`test:quality-tools`. Typed ESLint keeps union switches exhaustive; do not add a
default branch to hide a missing domain case.

If `pnpm run validate` cannot run, report which narrower checks ran and why full
validation was skipped.
