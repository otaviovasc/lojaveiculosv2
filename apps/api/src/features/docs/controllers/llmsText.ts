export const llmsText = `# Loja Veiculos API

## API entry points
- OpenAPI document: /api/v1/openapi.json
- Health check: /health
- Public storefront settings: GET /api/v1/public/storefront/settings
- Public storefront listings: GET /api/v1/public/storefront/listings
- Public storefront listing detail: GET /api/v1/public/storefront/listings/{listingSlug}
- Role management matrix: GET /api/v1/identity/roles
- Update member access: PATCH /api/v1/identity/memberships/{membershipId}/access
- Billing overview: GET /api/v1/billing/overview
- Update store entitlement: PATCH /api/v1/billing/entitlements/{featureKey}
- List external API clients: GET /api/v1/external-api/clients
- Create external API client: POST /api/v1/external-api/clients
- Revoke external API client: POST /api/v1/external-api/clients/{clientId}/revoke
- Internal health snapshot: GET /api/v1/internal/health
- List inventory stock: GET /api/v1/inventory/listings
- Create listing: POST /api/v1/inventory/listings
- Get listing: GET /api/v1/inventory/listings/{listingId}
- Update listing details: PATCH /api/v1/inventory/listings/{listingId}
- Update listing description: PATCH /api/v1/inventory/listings/{listingId}/description
- Update listing price: PATCH /api/v1/inventory/listings/{listingId}/price
- Attach listing unit: PUT /api/v1/inventory/listings/{listingId}/unit
- Update listing unit: PATCH /api/v1/inventory/listings/{listingId}/units/{unitId}
- Create vehicle cost: POST /api/v1/inventory/listings/{listingId}/costs
- Request listing media upload: POST /api/v1/inventory/listings/{listingId}/media/uploads
- Attach uploaded listing media: POST /api/v1/inventory/listings/{listingId}/media
- Reserve listing: POST /api/v1/inventory/listings/{listingId}/reserve
- Sell listing: POST /api/v1/inventory/listings/{listingId}/sell
- Change listing status: PATCH /api/v1/inventory/listings/{listingId}/status

## Authentication
- API clients should send a bearer token in the Authorization header.
- Scoped API keys may send x-api-key: lv2_... or Authorization: Bearer lv2_...
- Public storefront requests resolve store scope from Host or x-forwarded-host subdomain.
- Protected requests require Clerk user identity and store membership context.
- Operational external API requests may use scoped integration identity; billing, settings, user-management, tenant-management, and audit-management stay user-only.
- Tenant-scoped requests resolve tenantId, storeId, actor, permissions, requestId, logger, and audit sink before services run.

## Scopes
- inventory.read: required to read vehicle inventory.
- inventory.create: reserved for vehicle creation workflows.
- inventory.update_description: reserved for descriptive inventory edits.
- inventory.update_price: reserved for price edits.
- inventory.update_status: reserved for listing lifecycle edits.
- inventory.update_unit: reserved for physical/unit inventory edits.
- inventory.cost_create: required to create vehicle costs and linked finance entries.
- inventory.reserve: required to reserve vehicle inventory and emit a reservation receipt.
- inventory.sell: required to sell vehicle inventory and emit sale documents.
- inventory.delete: reserved for vehicle deletion workflows.
- users.manage: required to list and update store role/permission management.
- billing.manage: required to read billing and mutate store entitlements.
- external_api.manage: required to create and revoke scoped API keys.
- audit.read: required to read the internal health and audit snapshot.

## Current inventory endpoints
- GET /api/v1/public/storefront/listings: lists published, visible vehicles for storename.lojaveiculos.com.br.
- GET /api/v1/public/storefront/settings: returns public-safe hero, SEO, contact, and branding settings for a published store.
- GET /api/v1/public/storefront/listings/{listingSlug}: returns one published, visible vehicle plus public media.
- GET /api/v1/inventory/listings: returns canonical V2 stock list DTOs; requires inventory.read.
- POST /api/v1/inventory/listings: creates a listing and returns canonical V2 listing detail; requires inventory.create.
- GET /api/v1/inventory/listings/{listingId}: returns canonical V2 listing detail with units and media; requires inventory.read.
- PATCH /api/v1/inventory/listings/{listingId}: updates listing details; workflow statuses are blocked.
- PATCH /api/v1/inventory/listings/{listingId}/description: updates descriptive fields; requires inventory.update_description.
- PATCH /api/v1/inventory/listings/{listingId}/price: updates price; requires inventory.update_price.
- PUT /api/v1/inventory/listings/{listingId}/unit: attaches an operational unit; requires inventory.create.
- PATCH /api/v1/inventory/listings/{listingId}/units/{unitId}: updates physical/unit fields; workflow statuses are blocked.
- POST /api/v1/inventory/listings/{listingId}/costs: records a vehicle cost and creates linked finance entry rows.
- POST /api/v1/inventory/listings/{listingId}/media/uploads: returns Cloudflare R2 presigned PUT upload instructions.
- POST /api/v1/inventory/listings/{listingId}/media: records uploaded R2 object as listing media after scoped storage validation.
- POST /api/v1/inventory/listings/{listingId}/reserve: reserves a unit, emits reservation_receipt, and creates linked finance entries.
- POST /api/v1/inventory/listings/{listingId}/sell: sells a unit, emits sale documents, and creates linked finance entries.
- PATCH /api/v1/inventory/listings/{listingId}/status: changes non-workflow lifecycle status; requires inventory.update_status.

## Current identity endpoints
- GET /api/v1/identity/roles: returns role templates, grouped permission catalog, memberships, base permissions, effective permissions, and overrides.
- PATCH /api/v1/identity/memberships/{membershipId}/access: updates one subuser role and explicit permission overrides.

## Current billing endpoints
- GET /api/v1/billing/overview: returns plans, subscription status, and store entitlements; requires billing.manage.
- PATCH /api/v1/billing/entitlements/{featureKey}: updates one entitlement status and writes critical audit; requires billing.manage.

## Current external API endpoints
- GET /api/v1/external-api/clients: returns scoped API clients and key prefixes; requires external_api.manage.
- POST /api/v1/external-api/clients: creates a scoped API client and returns the plaintext key once; requires external_api.manage.
- POST /api/v1/external-api/clients/{clientId}/revoke: revokes the client and active keys; requires external_api.manage.

## Current internal monitoring endpoints
- GET /api/v1/internal/health: returns recent scoped audit events plus open audit sink failures; requires audit.read.

## Finance side effects
- Vehicle cost, reserve, and sell workflows create finance_entries in the same tenant/store scope.
- Finance rows are linked through finance_entry_links to targets such as vehicle_cost, vehicle_listing, vehicle_unit, sale, and sale_payment.

## Vehicle document kinds
- Workflow documents include reservation_receipt, sale_contract, sale_receipt, delivery_term, and power_of_attorney.

## External API safety limits
- External write/import APIs are tenant and store scoped.
- External clients use least-privilege scopes instead of operator roles.
- Mutations must be idempotent where possible and include request identifiers for audit correlation.
- Rate limits, payload size limits, and pagination caps must be enforced before public external API launch.
- Destructive operations must require explicit delete scopes and audit records.
`;
