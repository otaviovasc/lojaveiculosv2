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
3. Reserve a listing through `reserveVehicleListing`.
4. Emit one `reservation_receipt` PDF document for the signal payment and
   create linked finance entries for reservation accounting.
5. Sell a listing through `sellVehicleListing`.
6. Emit four sale PDFs: `sale_contract`, `sale_receipt`, `delivery_term`, and
   `power_of_attorney`.
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
4. Keep files under 250 lines by extracting coherent modules, not by hiding
   complexity in generic helpers.
5. Run `pnpm run validate` before handoff.
