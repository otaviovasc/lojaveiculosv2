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
- Prefer small modules. Keep source files under 250 lines unless the file is a
  generated artifact or a documented exception.

## Quality Gates

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
