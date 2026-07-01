# Architecture

## Primary Decision

V2 will live in `./lojaveiculosv2` and deploy primarily to Railway. The target
is one Railway project where V2 services, V2 databases, and the transitional
CRM backend can communicate privately.

Loja Veiculos V2 is primarily a product for stores, not a buyer-operated
marketplace. Public storefronts expose inventory and lead capture, but inventory
mutation, reservation, sale close, document emission, billing, and audit flows
are executed by authenticated store actors with explicit permissions.

## Backend Shape

Backend code follows a domain/service plus feature/controller split:

```text
apps/api/src/
├── domains/
│   └── vehicle/
│       ├── documents/
│       ├── ports/
│       ├── readModels/
│       └── services/
│           └── VehicleService/
│               ├── createVehicle.ts
│               └── getVehicle.ts
├── features/
│   └── inventory/
│       ├── adapters/
│       │   └── memory/
│       └── controllers/
└── infrastructure/
```

Controllers are feature-scoped so features can be enabled or disabled per
customer. Domain services are business capabilities and must be testable without
HTTP, provider SDKs, or a live database.

Folder placement is governed by `docs/repo-organization.md`. The most important
rule is directional dependency: domains own business modules and ports; features
own delivery modules and feature-local adapters; infrastructure owns real
provider adapters.

## HTTP Error Contract

API controllers must return errors through
`apps/api/src/infrastructure/http/apiErrorResponse.ts`. The public JSON shape is:

```json
{
  "message": "Human readable technical summary.",
  "code": "STABLE_ERROR_CODE",
  "requestId": "request correlation id",
  "details": {}
}
```

`details` is optional and is the place for validation issues, missing workflow
fields, retry-after seconds, or other structured non-sensitive debugging data.
Do not put request bodies, secrets, tokens, customer message bodies, raw provider
payloads, or database rows in `details`.

Controllers map known domain, authorization, provider, and validation errors to
stable `code` values and HTTP statuses. They must not return ad hoc
`context.json({ message }, status)` errors or assign `context.error` directly.
`jsonApiError` also records error metadata for the local HTTP logger so 4xx/5xx
responses are emitted as `request.failed` with `code`, `status`, `requestId`,
and error name where available.

Frontend API clients must parse responses through `apps/web/src/lib/apiErrors.ts`
or a feature wrapper around it. UI surfaces should render the friendly
`userMessage` plus the request id when present. The request id is the bridge
between what the user can report and what operators can find in logs.

This contract is enforced by API tests and `pnpm run check:api-errors`, which is
part of `validate:core-guardrails`.

## Transaction Direction

Cross-repository product mutations use the transaction runner seam from
`apps/api/src/shared/transaction.ts`. Domains still receive ports and remain
ignorant of Drizzle. Feature service composition decides whether a mutation uses
a passthrough runner, for memory/test adapters, or a client-backed runner that
rebuilds ports from the transaction client.

Use this pattern when one user action writes multiple product tables or when a
repository method performs validation plus linked inserts that must commit
together. Current examples include vehicle reserve/sell/cost/status/document
workflows, finance entry/document mutations, and document create/update
mutations. The seam provides product database atomicity; object storage and
provider calls are external side effects and are not rolled back by Postgres.
Avoid holding a transaction open across external IO unless the workflow cannot
yet be shortened without changing persisted identifiers. Do not add ad hoc
Drizzle transactions inside domain services.

## CRM Boundary

The CRM frontend will move into `apps/web`. V2 owns leads from cutover onward:
lead capture, lead identity, store lead history, and pipeline references belong
to V2. The `repasses-lojaveiculos-backend` remains a transitional WhatsApp/team
workflow backend during migration. V2 must call it through
`apps/api/src/domains/crm/acl` or a frontend API client that speaks V2 terms,
translates repasses API details, and stores repasses ids only as external
references.

## Frontend Form Direction

Feature forms in `apps/web` must use the shared feature primitives
(`FeatureField`, `FeatureInput`, `FeatureSelect`, `FeatureActionButton`) before
adding local markup. Masks for Brazilian documents, phones, and CEP values must
come from the existing mask utilities, not from screen-local string handling.

Client-side validation should mirror the backend controller schema for the same
payload and block obviously invalid submissions before the API call. Backend
validation remains authoritative and must return field-level issues for 400
responses so logs and UI messages identify the failing field without logging
request bodies.

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

Vehicle workflow document generation is domain-owned under
`apps/api/src/domains/vehicle/documents`. Reserving a listing must emit one
`reservation_receipt`; selling a listing must emit `sale_contract`,
`sale_receipt`, `delivery_term`, and `power_of_attorney`.

Vehicle cost, reserve, and sell workflows must also create tenant/store-scoped
`finance_entries` rows. Those rows are connected through `finance_entry_links`
to the workflow source, including `vehicle_cost`, `vehicle_listing`,
`vehicle_unit`, `sale`, and `sale_payment` targets when the workflow creates or
uses those records.

Reservation and sale services may receive customer/buyer snapshots for the
documents, but the buyer is never the actor allowed to reserve or sell. The
service actor is the authenticated store user recorded in `ServiceContext`.

Every application table must use the shared `lifecycleColumns` helper:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamp with time zone not null default now()`
- `updated_at timestamp with time zone not null default now()` with Drizzle
  on-update behavior

Tables with user-deletable product data should also use `softDeleteColumns`.
Schema files are checked by `pnpm run check:db`; do not inline id or timestamp
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
