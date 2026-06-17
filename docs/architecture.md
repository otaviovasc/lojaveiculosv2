# Architecture

## Primary Decision

V2 will live in `./lojaveiculosv2` and deploy primarily to Railway. The target
is one Railway project where V2 services, V2 databases, and the transitional
CRM backend can communicate privately.

## Backend Shape

Backend code follows a domain/service plus feature/controller split:

```text
apps/api/src/
├── domains/
│   └── vehicle/
│       ├── domain/
│       ├── ports/
│       ├── repositories/
│       └── services/
│           └── VehicleService/
│               ├── createVehicle.ts
│               └── getVehicle.ts
├── features/
│   └── inventory/
│       └── controllers/
│           └── vehicle.controller.ts
└── infrastructure/
```

Controllers are feature-scoped so features can be enabled or disabled per
customer. Domain services are business capabilities and must be testable without
HTTP, provider SDKs, or a live database.

## CRM Boundary

The CRM frontend will move into `apps/web`. V2 owns leads from cutover onward:
lead capture, lead identity, store lead history, and pipeline references belong
to V2. The `repasses-lojaveiculos-backend` remains a transitional WhatsApp/team
workflow backend during migration. V2 must call it through
`apps/api/src/domains/crm/acl` or a frontend API client that speaks V2 terms,
translates repasses API details, and stores repasses ids only as external
references.

## Database Direction

The new DB must use English-only `lower_snake_case` table and column names.
Drizzle owns the V2 schema and migrations. We chose it because V2 needs explicit
schema review, SQL visibility, migration clarity, and enforceable naming.

Tenancy naming is intentionally split:

- `tenants` are legal/billing accounts, including agencies that pay for or
  manage multiple stores.
- `stores` are operating dealerships. Most V1 `Loja` operational data migrates
  to store-scoped tables.

Inventory must also be split:

- `listings` represent advertised commercial inventory.
- `units` represent physical or stock-counted vehicles.
- 0km inventory uses a hybrid model where one listing may have color stock
  buckets and optional unit rows when individual unit data exists.

Documents are shared domain objects linked to stores, leads, listings, units,
sales, test drives, and fiscal flows instead of being duplicated inside each
bounded context.

Every application table must use the shared `lifecycleColumns` helper:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone not null default now()` with Drizzle
  on-update behavior

Tables with user-deletable product data should also use `softDeleteColumns`.
Schema files are checked by `npm run check:db`; do not inline id or timestamp
columns in table definitions.

## Audit Direction

Audit must be treated as product infrastructure, not optional logging. Every
service receives an `AuditSink` through `ServiceContext` and records relevant
actions with actor, store, tenant, request, entity, and provider metadata.

Audit storage uses a separate Railway Postgres database from the product DB.
Audit schemas live in `packages/audit-db`; product schemas live in `packages/db`.
Do not create audit tables in the product database.

Audit failures are tiered. Billing mutations, permission mutations, document
generation/signing, sale close, and fiscal issue/cancel are critical and must
fail closed if audit cannot be persisted. Vehicle updates, lead assignment, and
integration sync state changes must be accepted by the audit sink or durable
retry queue. Low-risk diagnostics and non-billing analytics may fail open with a
warning and retry where available.

## Banking Direction

Banking is schema-only during the V1 migration. V2 may define table boundaries
for bank accounts, payment links, custody ledger references, and provider events,
but production money movement, custody flows, balances, and banking operations
remain disabled until a separate banking plan is approved.
