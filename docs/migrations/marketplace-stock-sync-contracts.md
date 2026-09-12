# Marketplace Stock Sync Contracts

Status: implemented contract. Updated: 2026-08-14

## Product Rules

- Scope is stock sync for `mercado_livre` and `olx`; lead sync is out.
- FIPE is the canonical V2 vehicle catalog.
- Do not add marketplace brand/model/year seed tables.
- `marketplace_provider_taxonomies` stores provider category/attribute contract cache only; it is not a vehicle brand/model/year source.
- Payloads map from `vehicle_listings.metadata.catalog` plus listing fields.
- Sync mirrors public V2 stock: publish, update, and unpublish when hidden, sold out, unpublished, archived, or deleted.
- Sync is manual/operator-triggered and creates durable jobs. A bounded worker
  performs provider effects and reconciles asynchronous provider status.
- Tests must not make live provider calls.
- OLX uses the known Autoupload contract defaults and fails closed when client
  credentials are missing or an explicit contract override is invalid.
- Never return tokens, secrets, raw provider payloads, or sensitive customer
  data. OLX import-status tokens are encrypted as private job state, scoped to
  the originating account/job, and never enter metadata, logs, audit, or HTTP DTOs.

The target segment is dealerships publishing V2 public inventory to an
authorized marketplace account. The outcome is truthful publication state
without duplicate submissions; leading measures are terminal reconciliation
rate and age of the oldest submitted job. The `marketplace` entitlement gates
new effects, while reconciliation of already-submitted effects remains an
operational recovery action. Product support owns manual recovery when the
provider token expires or the originating account identity is unavailable.

## Routes

All routes live under `/api/v1/marketplaces`, require the `marketplace` entitlement, and use the shared JSON API error envelope.

```ts
type MarketplaceProvider = "mercado_livre" | "olx";
type MarketplaceStockSyncPreviewRequest = {
  provider: MarketplaceProvider;
  listingIds?: string[];
};
type MarketplaceStockSyncPreviewResponse = {
  batchId: string;
  plan: MarketplaceStockPlan;
  provider: MarketplaceProvider;
};
type MarketplaceStockSyncRunRequest = {
  provider: MarketplaceProvider;
  batchId?: string;
  listingIds?: string[];
};
type MarketplaceStockSyncRunResponse = {
  batchId: string;
  createdJobs: MarketplaceJob[];
  plan: MarketplaceStockPlan;
  provider: MarketplaceProvider;
};
type MarketplaceSyncJobRetryRequest = { reason?: string };
type MarketplaceSyncJobRetryResponse = {
  job: MarketplaceJob;
  previousJobId: string;
};
type MarketplaceSyncJobReconcileResponse = MarketplaceJob;
```

Required endpoints:

- `POST /integrations/{provider}/stock-sync/preview`
- `POST /integrations/{provider}/stock-sync/run`
- `POST /sync-jobs/{jobId}/retry`
- `POST /sync-jobs/{jobId}/reconcile`

Existing single-job routes remain, but metadata must be strictly validated and
known marketplace failures must not return `MARKETPLACE_REQUEST_ERROR`. A
direct single-job command requires a client-generated UUID `metadata.commandId`;
repeating that command returns the same durable job instead of creating another
provider effect.

## Overview And Projection

DB additions are `marketplace_provider_taxonomies` and
`marketplace_catalog_mappings`; neither table seeds vehicle catalogs.

```ts
type MarketplaceAccountConnectionStatus =
  | "not_configured"
  | "not_connected"
  | "paused"
  | "connected"
  | "refreshable"
  | "reconnect_required"
  | "blocked"
  | "degraded";
type MarketplaceAccountRequirement = {
  code: MarketplaceServiceErrorCode;
  message: string;
  severity: "blocked" | "ok" | "warning";
  userAction: string;
};
type MarketplaceProviderState = {
  accountId: string | null;
  connectionStatus: MarketplaceAccountConnectionStatus;
  lastSyncSummary: MarketplaceStockSyncSummary | null;
  provider: MarketplaceProvider;
  requirements: MarketplaceAccountRequirement[];
};
type MarketplaceStockSyncSummary = {
  batchId: string | null;
  blocked: number;
  failed: number;
  noOp: number;
  publish: number;
  queued: number;
  succeeded: number;
  total: number;
  unpublish: number;
  update: number;
};
```

`MarketplaceOverview` extends the existing response with
`providerStates: readonly MarketplaceProviderState[]`.

`MarketplaceListingProjection` includes FIPE catalog, readiness fields, technical
fields, store phone/CEP, selected unit plate, public slug, media/unit, and stock label.

## Stock Planner

```ts
type MarketplaceStockPlanDecision =
  "publish" | "update" | "unpublish" | "no_op" | "pending" | "blocked";
type MarketplaceListingBlockerCode =
  | "MARKETPLACE_LISTING_NOT_PUBLIC"
  | "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS"
  | "MARKETPLACE_LISTING_PRICE_MISSING"
  | "MARKETPLACE_LISTING_FIPE_CATALOG_MISSING"
  | "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING"
  | "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING"
  | "MARKETPLACE_LISTING_CONTACT_PHONE_MISSING"
  | "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING"
  | "MARKETPLACE_LISTING_LICENSE_PLATE_MISSING"
  | "MARKETPLACE_LISTING_MAPPING_REQUIRED";
type MarketplaceListingBlocker = {
  code: MarketplaceListingBlockerCode;
  field?: string;
  message: string;
  userAction: string;
};
type MarketplaceStockPlanItem = {
  blockers: MarketplaceListingBlocker[];
  decision: MarketplaceStockPlanDecision;
  externalId: string | null;
  jobType: "listing_publish" | "listing_update" | "listing_unpublish" | null;
  listing: MarketplaceListingProjection;
  provider: MarketplaceProvider;
};
type MarketplaceStockPlan = {
  blocked: number;
  items: MarketplaceStockPlanItem[]; // actionable or blocked rows only
  noOp: number;
  pending: number;
  publish: number;
  total: number;
  unpublish: number;
  update: number;
};
```

Planner rules:

- Ready local listing with no provider row: `publish`.
- Ready local listing with provider row: `update`.
- Local listing hidden, sold, unpublished, archived, or deleted with provider
  row: `unpublish`.
- Blocked local listing with no provider row: `blocked`.
- A listing with a queued, running, or provider-submitted job: `pending`; no
  duplicate job is created by another stock batch.
- Non-provider-relevant local listing with no provider row is excluded from the
  customer-facing total. `noOp` remains zero for this actionable preview.
- Missing FIPE catalog or unresolved mappings block before provider IO.

## Provider Gateway

```ts
type MarketplaceProviderGateway = {
  checkAccount: (
    input: MarketplaceProviderAccountInput,
  ) => Promise<MarketplaceProviderAccountStatus>;
  createAuthorizationUrl: (
    input: MarketplaceAuthorizationRequest,
  ) => Promise<string>;
  exchangeAuthorizationCode: (input: {
    code: string;
    redirectUri: string;
  }) => Promise<MarketplaceTokenSet>;
  provider: MarketplaceProvider;
  refreshToken?: (refreshToken: string) => Promise<MarketplaceTokenSet>;
  runListingSync: (
    input: MarketplacePublishInput,
  ) => Promise<MarketplacePublishResult>;
  reconcileListingSync?: (
    input: MarketplaceListingReconciliationInput,
  ) => Promise<MarketplaceListingReconciliationResult>;
};
```

Mercado Livre defaults to category `MLB1744` and must send `BRAND`, `MODEL`,
`TRIM`, `VEHICLE_YEAR`, `VEHICLE_TYPE`, `FUEL_TYPE`, `DOORS`, and
`KILOMETERS`, plus token refresh, account check, duplicate reconciliation,
sanitized HTTP errors, 429 retry-after, and 5xx outage mapping.

OLX uses the Autoupload contract: authorization URL
`https://auth.olx.com.br/oauth`, token URL
`https://auth.olx.com.br/oauth/token`, API base `https://apps.olx.com.br`,
listing path `/autoupload/import`, account check path
`/oauth_api/basic_user_info`, scope
`autoupload basic_user_info autoservice chat`, and `access_token` inside the
JSON body. Missing `OLX_CLIENT_ID` or `OLX_CLIENT_SECRET` returns
`MARKETPLACE_PROVIDER_NOT_CONFIGURED`; an invalid explicit contract override
returns `MARKETPLACE_PROVIDER_CONTRACT_MISSING`.
OLX publish/update requires store phone, store CEP, and selected unit plate for used vehicles; missing values block before provider IO. A synchronous
`statusCode=0` means submitted, not published. The worker polls the private
import token, keeps the integrator ad id distinct from OLX `list_id`, and only
marks success after an exact accepted insert/update or accepted delete result.
Pending, queued, provider lag, rate limits, and unknown transport outcomes stay
submitted with bounded backoff. Refused/error results become terminal failures;
expired or unrecoverable confirmation becomes explicit manual recovery and is
never blindly resent.

## Stable Errors

`MarketplaceServiceErrorCode` is one of:
`MARKETPLACE_ACCOUNT_NOT_CONNECTED`, `MARKETPLACE_ACCOUNT_PAUSED`,
`MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED`,
`MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED`, `MARKETPLACE_LISTING_NOT_READY`,
`MARKETPLACE_LISTING_NOT_FOUND`, `MARKETPLACE_LISTING_MAPPING_REQUIRED`,
`MARKETPLACE_PROVIDER_NOT_CONFIGURED`, `MARKETPLACE_PROVIDER_CONTRACT_MISSING`,
`MARKETPLACE_PROVIDER_VALIDATION_FAILED`, `MARKETPLACE_PROVIDER_CONFLICT`,
`MARKETPLACE_PROVIDER_RATE_LIMITED`, `MARKETPLACE_PROVIDER_UNAVAILABLE`,
`MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED`, `MARKETPLACE_TOKEN_REFRESH_FAILED`,
`MARKETPLACE_SYNC_JOB_INVALID_METADATA`, `MARKETPLACE_SYNC_JOB_NOT_RETRYABLE`,
`MARKETPLACE_SYNC_JOB_STALE`, `MARKETPLACE_SYNC_PARTIAL_FAILURE`, or
`MARKETPLACE_REQUEST_VALIDATION_FAILED`.

```ts
type MarketplaceServiceError = {
  code: MarketplaceServiceErrorCode;
  details?: Record<string, unknown>;
  jobId?: string;
  listingId?: string;
  message: string;
  provider?: MarketplaceProvider;
  requestId?: string;
  retryAfterSeconds?: number;
  status: number;
  userAction: string;
};
```

Safe details may include provider, ids, vehicle label, field names, blocker
codes, retry seconds, batch id, and request id. Never include tokens, secrets,
raw provider payloads, customer message bodies, or raw DB rows.

## Job Metadata And Audit

```ts
type MarketplaceJobMetadata = {
  batchId?: string;
  commandId?: string;
  listingId?: string;
  planDecision?:
    "publish" | "update" | "unpublish" | "no_op" | "pending" | "blocked";
  providerRequest?: {
    attributeIds?: string[];
    categoryId?: string;
    parameterIds?: string[];
  };
  providerResult?: {
    externalId?: string | null;
    listingUrl?: string | null;
    message?: string | null;
    providerListingId?: string | null;
    providerRequestId?: string | null;
    providerStatus?: string | null;
  };
  retryOfJobId?: string;
  stockSync?: true;
};
```

`externalId`, provider request/result evidence, dispatch leases, and OLX import
tokens are server-owned state. HTTP callers cannot supply them. The overview
may expose sanitized provider evidence only after the server records it.

Audit events: preview, queue, run, retry, success, failure, and partial failure
under the `marketplace.stock_sync.*` / `marketplace.sync_job.*` namespaces.
