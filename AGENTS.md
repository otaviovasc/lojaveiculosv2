# V2 Agent Rules

These rules apply to every file under `lojaveiculosv2/`.

## Product Goal

Build the new Loja Veiculos OS: dealership stock/sales/expenses/commissions,
tenant pages, external API, NFE integrations, billing, permissions, audit, and a
CRM frontend migrated from `repasses-frontend` while keeping
`repasses-lojaveiculos-backend` as the CRM backend until explicitly replaced.

This is primarily a store-operated product, not a buyer-operated marketplace.
Public storefront users can view inventory and submit interest, but only
authenticated store actors may mutate inventory, reserve vehicles, close sales,
emit documents, manage billing, or trigger audited operational workflows.

## Architecture Rules

- Follow `docs/repo-organization.md` before adding or moving files.
- For non-trivial work, also follow
  `docs/agents/lojaveiculosv2-repo-skill.md`.
- If the `codebase-memory-mcp` tools are available in the active agent
  surface, use them before repo exploration and while navigating unfamiliar
  code paths. Prefer indexing/searching the current checkout with
  `codebase-memory-mcp` over broad manual scans, and refresh the index after
  meaningful code movement or feature-flow changes.
- For Railway, CI/CD, staging, production, or incident work, read
  `docs/maximum-agentic-loop-railway-terraform.md`,
  `docs/railway.md`, and the relevant runbook in `docs/runbooks/`.
- Keep runtime variables documented in `docs/ops/env-vars.md`.
- Keep backend business logic inside `apps/api/src/domains/<domain>/services/`.
- Name service folders with PascalCase plus `Service`, for example
  `VehicleService/getVehicle.ts`.
- Keep HTTP controllers inside `apps/api/src/features/<feature>/controllers/`.
- Keep feature-local adapters inside `apps/api/src/features/<feature>/adapters/`.
- Controllers parse input, enforce feature routing, call services, and map
  responses. They must not contain business rules.
- Memory repositories and storage fakes are adapters, not controllers.
- Domain service code must not import HTTP, Railway, Clerk, Drizzle, Pino,
  provider SDKs, or framework adapters directly.
- Domain test support must not import from `features`; keep domain test adapters
  in `apps/api/src/domains/<domain>/testSupport*.ts`.
- Cross-domain calls must use ports or anti-corruption-layer clients.
- Shared code belongs in `packages/shared` only when two apps/packages already
  need it.
- Features copied from another project should first be ported as directly as
  possible, then adapted to the target project's conventions. Do not rewrite
  working behavior unless V2 architecture, correctness, tenant isolation,
  validation, or maintainability clearly requires it.
- Backend improvements during migration must be justified by an existing
  mismatch, correctness issue, or stronger local convention. Avoid
  opportunistic rewrites.

## Security And Audit

- Treat Render, Railway, and production databases as live production systems.
- Production MCP usage is read-only by default: logs, metrics, deploy status,
  service topology, and schema metadata. Do not mutate services, variables,
  databases, or deploy state unless the user explicitly asks.
- Do not print secrets, full environment values, customer personal data,
  message bodies, tokens, documents, or raw database rows in chat or docs.
- Every service entrypoint must accept an explicit `ServiceContext`.
- `ServiceContext` must include actor, tenant/store scope, permissions, request
  id, logger, and audit sink.
- Permission checks are mandatory even for public flows. Public is a permission
  classification, not absence of permission.
- Per-field permissions must be represented as explicit permission keys. Example:
  changing a vehicle description and changing a vehicle price are different
  permissions.
- Store feature access must be represented as entitlements. Billing controls
  entitlements; permissions control who can use them.
- Every relevant user action, webhook, external API action, billing event, and
  integration result must emit an audit event.
- Logs must be scoped and structured with useful identifiers such as `userId`,
  `storeId`, `tenantId`, `connectionId`, `vehicleId`, `requestId`, and provider
  event ids when available.

## Frontend Rules

- Use the design tokens from `packages/design-system` and `apps/web/src/styles`.
- Do not hardcode hex/rgb/hsl colors in components.
- Use icon-only controls for compact tool actions, with accessible labels and
  tooltips.
- Build responsive PWA states from day zero.
- Avoid overlapping animations, loading states, popovers, and fixed toolbars.
  Components with animated state need explicit empty/loading/error/success
  layouts.
- Feature pages must use shared primitives for recurring layouts and UI
  patterns. When multiple existing implementations exist, promote the best
  existing one as the source of truth and migrate weaker duplicates to it. If no
  primitive satisfies the page's need, create a new primitive or add a small
  variant to an existing primitive instead of implementing a one-off local
  version.
- Do not invent new styling during primitive extraction. Visual normalization is
  only allowed when replacing weaker existing implementations with the chosen
  existing source-of-truth component.
- Centro Imovel may be used as a UI reference library for V2. Copy or adapt
  strong UI patterns from Centro Imovel into V2 primitives when they are better
  than current V2 patterns or missing from V2.
- Do not migrate business logic from reference projects during UI primitive
  work unless explicitly requested. Keep primitive extraction presentational and
  compositional.
- Skeleton feature pages should still use shared page shell, page header,
  empty/loading/error states, and common action patterns.
- Before creating a new local UI implementation inside `/features`, check
  whether a primitive already exists. If it does, use it. If it almost works,
  add a small variant. If no primitive fits and the pattern is recurring, create
  one.
- Prefer small modules. Keep source files under 250 lines unless the file is a
  generated artifact or a documented exception.

## Quality Gates

Use the validation tier that matches the action:

- `pnpm run validate:commit` is the fast pre-commit guardrail.
- `pnpm run validate:push` is the full pre-push gate.
- `pnpm run validate` aliases the full pre-push gate and remains the default
  handoff command.

Run from `lojaveiculosv2/` before handing work back:

```bash
pnpm run validate
```

For deploy smoke contracts, run:

```bash
pnpm run test:smoke:api
```

Do not disable lint, tests, type checks, audit checks, or boundary checks to make
a change pass. Fix the implementation or document a temporary exception in
`docs/architecture.md`.
