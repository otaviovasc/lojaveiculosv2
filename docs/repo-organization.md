# Repository Organization

This repo is organized for humans and agents to find the correct module without
guessing. Prefer adding a small, well-named module in the correct folder over
growing a broad file.

## Backend Folder Contract

```text
apps/api/src/
├── domains/<domain>/
│   ├── documents/       # domain-owned document specs, renderers, materializers
│   ├── authorization/   # domain-specific actor and permission invariants
│   ├── ports/           # interfaces satisfied by adapters
│   ├── readModels/      # query DTOs that services/controllers may return
│   ├── services/        # audited, permission-checked business entrypoints
│   └── testSupport*.ts  # domain test adapters and fixtures only
├── features/<feature>/
│   ├── adapters/        # feature-local memory/runtime adapters
│   └── controllers/     # HTTP routes, schemas, DTO mapping, feature routing
├── infrastructure/      # Drizzle, R2, Clerk, HTTP runtime, provider clients
├── jobs/                # CLI/cron entrypoints that call services
└── shared/              # API-local cross-cutting helpers
```

Rules:

- `domains` must not import from `features` or `infrastructure`.
- `features/*/controllers` must not hold persistence adapters.
- `features/*/adapters` may satisfy domain ports for memory or feature-local
  runtime usage.
- `infrastructure` is the only place for provider SDK clients and real DB/R2
  adapters.
- Service files under `domains/*/services/**` are public business entrypoints:
  they must accept `ServiceContext`, assert permissions, log, and audit.
- Cross-repository mutations should run through the shared transaction runner
  seam in feature/runtime composition. Domain modules receive transaction-bound
  ports; they do not import Drizzle or transaction clients.
- Controllers must map errors through the shared `jsonApiError` helper instead
  of returning ad hoc `{ message }` JSON bodies. Error response bodies include
  `message`, `code`, `requestId`, and optional structured `details`.

## Frontend Folder Contract

```text
apps/web/src/
├── app/                 # app shell and route/view composition
├── components/          # app-level reusable UI
├── features/<feature>/  # feature UI, API client, types, local state
└── styles/              # global CSS and design tokens
```

Feature folders may contain:

- `*Page.tsx` for route-level feature screens.
- `*Panel.tsx`, `*Table.tsx`, `*Workspace.tsx` for visible UI modules.
- `*Parts.tsx` for small presentational submodules extracted from dense UI.
- `apiClient.ts`, `apiRoutes.ts`, and focused API files for HTTP integration.
- `types.ts` and feature-specific type files.

Do not place domain business rules in frontend modules. The frontend may collect
workflow input and display state, but status changes, document emission, billing,
permissions, and audit live behind backend services.

Frontend API clients must use `apps/web/src/lib/apiErrors.ts` or a small
feature wrapper around it so backend error codes and request ids reach visible
UI states. User-facing errors should prefer friendly text plus `ID do erro`
when the backend provides a request id.

## Vehicle Domain Map

```text
domains/vehicle/
├── documents/
│   ├── vehicleWorkflowDocuments.ts  # required document bundle definitions
│   ├── vehicleWorkflowPdf.ts        # server-side PDF rendering
│   └── storeWorkflowDocument.ts     # render + R2/local storage materialization
├── authorization/
│   └── storeWorkflowActor.ts        # reserve/sell require store user actors
├── ports/
│   ├── vehicleInventoryRepository.ts
│   ├── vehicleMediaStorage.ts
│   ├── vehicleOperationsRepository.ts
│   └── vehicleSalesRepository.ts
└── services/
    ├── VehicleCatalogService/
    └── VehicleService/
```

The vehicle lifecycle is canonical:

1. Create or edit listing/unit/media/document data.
2. Record vehicle costs through `addVehicleCost`, creating linked finance
   entries for cost accounting.
3. Reserve a listing through `reserveVehicleUnit`.
4. Emit one `reservation_receipt` PDF document for the signal payment and
   create linked finance entries for reservation accounting.
5. Sell a listing through `sellVehicleUnit`.
6. Emit the selected sale PDF bundle from the supported kinds:
   `sale_contract`, `sale_receipt`, `delivery_term`, and `power_of_attorney`.
   The UI selects all four by default, but the workflow must honor a valid
   persisted subset unless store policy marks a kind as required.
7. Create linked finance entries for sale and payment accounting.

Reservation and sale are store-operated product workflows. A customer/buyer
snapshot may be required for document content, but the customer is not an actor
that can reserve or sell a vehicle in V2. The actor is the authenticated store
user carried by `ServiceContext`.

## Adapter Placement

Memory adapters are real adapters, not controllers. Keep them under:

- `apps/api/src/features/inventory/adapters/memory`
- `apps/api/src/features/storefront/adapters/memory`

Production adapters stay under `apps/api/src/infrastructure`, for example:

- `infrastructure/db/vehicleInventory`
- `infrastructure/db/vehicleCatalog`
- `infrastructure/storage`

## Agent Checklist

Before adding or moving a module:

1. Decide whether the module is domain logic, feature delivery, infrastructure,
   frontend UI, or shared package code.
2. Place it according to the contracts above.
3. Keep the interface deep enough that callers do not need to understand its
   implementation details.
4. Keep source files under 250 lines by extracting coherent modules, not by
   hiding complexity in generic helpers. Long-form docs are exempt.
5. Run focused checks first, then `pnpm run validate` before handoff.

## Validation Tiers

- `pnpm run validate:commit`: fast commit guardrails used by pre-commit after
  `lint-staged`.
- `pnpm run validate:push`: full local gate used by pre-push and by
  `pnpm run validate`.
- `pnpm run validate:ci`: CI gate. It runs the push gate and then enforces V8
  coverage thresholds for every runtime workspace and emits both deployable
  production bundles. Keep deployment smoke checks separate.
- `pnpm run test:quality-tools`: regression suite for the AST/static guard
  implementations themselves. It runs in commit and push validation.
- `pnpm run check:format`: runs a repository-wide, non-mutating Prettier check
  so generated and AI-authored changes cannot bypass formatting through an
  unstaged file or a skipped editor integration.
- `pnpm run check:test-contracts`: blocks focused or unconditionally disabled
  tests, rejects literal tautologies, requires an assertion in every test, and
  prevents runtime workspaces from being silently omitted from tests.
- `pnpm run check:coverage`: requires every runtime workspace to expose the
  canonical coverage command/config, prevents threshold regression, and keeps
  shared web-library modules above the stricter per-file floor.
- `pnpm run check:toolchain`: protects strict TypeScript and typed ESLint
  settings, including exhaustive union switches, and deployable production
  build commands from being weakened; it also blocks TypeScript/ESLint bypass
  comments.
- `pnpm run check:web-bundle`: validates the Vite/Rolldown bundle policy and CI
  command ordering without reading a potentially stale `apps/web/dist`.
  `build:deployables` performs the separate artifact-size verification directly
  after a clean web production build.
- `pnpm run check:style-overrides`: keeps padding and radius decisions inside
  shared UI primitive variants instead of feature-local `className` overrides.
- `pnpm run check:ci-security`: keeps the CI token read-only, pins every runner
  and third-party action, disables persisted checkout credentials, requires
  bounded job timeouts, and verifies weekly Dependabot updates for actions.
- `pnpm run check:api-errors`: blocks direct controller `{ message }` JSON
  error responses and manual `context.error` assignment outside the shared HTTP
  error helper.
- `pnpm run check:contrast`: resolves semantic foreground/background tokens in
  light and dark themes, checks inherited hover/active/selected state colors,
  composites translucent surfaces, and requires tenant accent foreground
  tokens anywhere the dynamic accent is used as a background.
- `pnpm run check:validation`: verifies hooks, CI, and every `check:*` script
  stay wired into `validate:core-guardrails`.

When adding a new quality checker, name it `check:<area>` and add it to
`validate:core-guardrails`; `check:validation` enforces this. Checker logic must
also have focused regression coverage picked up by `test:quality-tools`.
