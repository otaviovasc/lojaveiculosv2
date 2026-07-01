export const llmsText = `# Loja Veiculos API

## API entry points
- OpenAPI document: /api/v1/openapi.json
- Health check: /health
- Public storefront settings: GET /api/v1/public/storefront/settings
- Public storefront listings: GET /api/v1/public/storefront/listings
- Public storefront listing detail: GET /api/v1/public/storefront/listings/{listingSlug}
- Public storefront lead capture: POST /api/v1/public/storefront/listings/{listingSlug}/leads
- Role management matrix: GET /api/v1/identity/roles
- Update member access: PATCH /api/v1/identity/memberships/{membershipId}/access
- Billing overview: GET /api/v1/billing/overview
- Billing provider status: GET /api/v1/billing/provider/status
- Update store entitlement: PATCH /api/v1/billing/entitlements/{featureKey}
- Fiscal overview: GET /api/v1/fiscal/overview
- Issue fiscal document: POST /api/v1/fiscal/documents
- Cancel fiscal document: POST /api/v1/fiscal/documents/{documentId}/cancel
- Sync fiscal status: POST /api/v1/fiscal/documents/{documentId}/status-sync
- Finance summary: GET /api/v1/finance/summary
- List finance entries: GET /api/v1/finance/entries
- Create finance entry: POST /api/v1/finance/entries
- Get finance entry: GET /api/v1/finance/entries/{entryId}
- Update finance entry: PATCH /api/v1/finance/entries/{entryId}
- Delete finance entry: DELETE /api/v1/finance/entries/{entryId}
- Request finance document upload: POST /api/v1/finance/entries/{entryId}/documents/uploads
- Attach finance document: POST /api/v1/finance/entries/{entryId}/documents
- Analytics dashboard: GET /api/v1/analytics/dashboard
- Compliance snapshot: GET /api/v1/compliance/snapshot
- Marketplace overview: GET /api/v1/marketplaces/overview
- Create marketplace OAuth URL: POST /api/v1/marketplaces/connect-url
- Complete marketplace OAuth: POST /api/v1/marketplaces/oauth/complete
- Upsert marketplace connection: PUT /api/v1/marketplaces/integrations/{provider}
- Queue marketplace sync: POST /api/v1/marketplaces/integrations/{provider}/sync-jobs
- Run marketplace sync: POST /api/v1/marketplaces/sync-jobs/{jobId}/run
- Documents workspace: GET /api/v1/documents
- Document versions: GET /api/v1/documents/{documentId}/versions
- External API manifest: GET /api/v1/external-api/manifest
- External API AI tools: GET /api/v1/external-api/ai-tools
- List external API clients: GET /api/v1/external-api/clients
- Create external API client: POST /api/v1/external-api/clients
- Revoke external API client: POST /api/v1/external-api/clients/{clientId}/revoke
- External vehicle list: GET /api/v1/external-api/vehicles
- External vehicle search: GET /api/v1/external-api/vehicles/search
- External vehicle detail: GET /api/v1/external-api/vehicles/{listingId}
- External lead list: GET /api/v1/external-api/leads
- External lead create: POST /api/v1/external-api/leads
- External lead detail: GET /api/v1/external-api/leads/{leadId}
- External lead update: PATCH /api/v1/external-api/leads/{leadId}
- Admin observability snapshot: GET /api/v1/internal/health
- List inventory units: GET /api/v1/inventory/units
- List inventory listing groups: GET /api/v1/inventory/listings
- Create listing: POST /api/v1/inventory/listings
- Get listing: GET /api/v1/inventory/listings/{listingId}
- Update listing details: PATCH /api/v1/inventory/listings/{listingId}
- Update listing description: PATCH /api/v1/inventory/listings/{listingId}/description
- Update listing price: PATCH /api/v1/inventory/listings/{listingId}/price
- Publish listing: POST /api/v1/inventory/listings/{listingId}/publish
- Unpublish listing: POST /api/v1/inventory/listings/{listingId}/unpublish
- Attach listing unit: PUT /api/v1/inventory/listings/{listingId}/unit
- Update listing unit: PATCH /api/v1/inventory/units/{unitId}
- Create vehicle cost: POST /api/v1/inventory/units/{unitId}/costs
- List unit checklists: GET /api/v1/inventory/units/{unitId}/checklists
- Create unit checklist: POST /api/v1/inventory/units/{unitId}/checklists
- Update unit checklist: PATCH /api/v1/inventory/units/{unitId}/checklists/{checklistId}
- Request unit document upload: POST /api/v1/inventory/units/{unitId}/documents/uploads
- Attach uploaded unit document: POST /api/v1/inventory/units/{unitId}/documents
- Request unit media upload: POST /api/v1/inventory/units/{unitId}/media/uploads
- Attach uploaded unit media: POST /api/v1/inventory/units/{unitId}/media
- Reserve unit: POST /api/v1/inventory/units/{unitId}/reserve
- Sell unit: POST /api/v1/inventory/units/{unitId}/sell
- Release unit reservation: POST /api/v1/inventory/units/{unitId}/reservation/release
- Cancel unit reservation: POST /api/v1/inventory/units/{unitId}/reservation/cancel
- Expire unit reservation: POST /api/v1/inventory/units/{unitId}/reservation/expire
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
- inventory.update_internal_notes: reserved for internal vehicle note edits.
- inventory.update_price: reserved for price edits.
- inventory.update_status: reserved for listing lifecycle edits.
- inventory.update_unit: reserved for physical/unit inventory edits.
- inventory.media_update: required to reorder media or update media metadata/visibility.
- inventory.media_delete: required to delete media records and request object cleanup.
- inventory.cost_create: required to create vehicle costs and linked finance entries.
- inventory.checklist_read: required to read vehicle readiness checklists.
- inventory.checklist_update: required to create and update vehicle readiness checklists.
- inventory.reserve: required to reserve, release, cancel, or expire vehicle unit reservations and emit reservation receipts.
- inventory.sell: required to sell vehicle units and emit sale documents.
- inventory.delete: reserved for vehicle deletion workflows.
- users.manage: required to list and update store role/permission management.
- billing.manage: required to read billing and mutate store entitlements.
- analytics.read: required to read reports and commercial dashboards.
- compliance.manage: required to read and operate LGPD/security controls.
- fiscal.manage: required to operate SPEDY/NF-e lifecycle workflows.
- finance.read: required to read finance entries, summaries, rules, and documents.
- finance.create: required to create finance entries, recurring entries, and commission rules.
- finance.update: required to update, pay, cancel, or delete finance entries.
- finance.attach_document: required to request uploads and attach finance entry documents.
- marketplace.read: required to read OLX/Mercado Livre connection status.
- marketplace.manage: required to connect or pause marketplace accounts.
- marketplace.inventory_sync: required to queue inventory sync jobs.
- marketplace.lead_sync: required to import leads from marketplaces.
- marketplace.listing_publish: required to publish listings.
- marketplace.listing_update: required to update listings.
- marketplace.listing_unpublish: required to remove listings.
- external_api.manage: required to create and revoke scoped API keys.
- documents.read: required to list shared store-scoped documents.
- documents.download: required to generate authorized document download descriptors.
- documents.preview: required to render document previews.
- documents.regenerate: required to regenerate operational documents.
- documents.update_links: required to change document store/unit links.
- documents.void: required to cancel issued/shared documents.
- audit.read: required to read the internal health and audit snapshot.

## Current inventory endpoints
- GET /api/v1/public/storefront/listings: lists published, visible vehicles for storename.lojaveiculos.com.br; thumbnailUrl is the first public photo from the deterministic default unit gallery.
- GET /api/v1/public/storefront/settings: returns public-safe hero, SEO, contact, and branding settings for a published store.
- GET /api/v1/public/storefront/listings/{listingSlug}: returns one published, visible vehicle plus unit/color media groups.
- POST /api/v1/public/storefront/listings/{listingSlug}/leads: creates a V2 CRM lead from public buyer interest.
- GET /api/v1/inventory/units: returns canonical V2 stock list DTOs, one row per vehicle_unit; requires inventory.read.
- GET /api/v1/inventory/listings: returns listing-group DTOs; requires inventory.read.
- POST /api/v1/inventory/listings: creates a listing and returns canonical V2 listing detail; requires inventory.create.
- GET /api/v1/inventory/listings/{listingId}: returns canonical V2 listing detail with units and media; requires inventory.read.
- PATCH /api/v1/inventory/listings/{listingId}: updates listing details; workflow statuses are blocked.
- PATCH /api/v1/inventory/listings/{listingId}/description: updates descriptive fields; requires inventory.update_description.
- PATCH /api/v1/inventory/listings/{listingId}/price: updates price; requires inventory.update_price.
- POST /api/v1/inventory/listings/{listingId}/publish: publishes a listing with explicit/generated public slug, visible flag, status history, and audit evidence; requires inventory.update_status.
- POST /api/v1/inventory/listings/{listingId}/unpublish: removes a listing from public storefront visibility while preserving its slug; requires inventory.update_status.
- PUT /api/v1/inventory/listings/{listingId}/unit: attaches an operational unit; requires inventory.create.
- PATCH /api/v1/inventory/units/{unitId}: updates physical/unit fields; workflow statuses are blocked.
- POST /api/v1/inventory/units/{unitId}/costs: records a vehicle cost and creates linked finance entry rows.
- GET /api/v1/inventory/units/{unitId}/checklists: lists persisted readiness checklists for a scoped unit.
- POST /api/v1/inventory/units/{unitId}/checklists: creates a readiness checklist and returns the updated listing detail.
- PATCH /api/v1/inventory/units/{unitId}/checklists/{checklistId}: updates checklist name/items/status and returns the updated listing detail.
- POST /api/v1/inventory/units/{unitId}/media/uploads: returns Cloudflare R2 presigned PUT upload instructions scoped to the unit folder.
- POST /api/v1/inventory/units/{unitId}/media: records uploaded R2 object as unit media after scoped storage validation.
- PATCH /api/v1/inventory/units/{unitId}/media/reorder: reorders unit media and returns the updated listing detail; requires inventory.media_update.
- PATCH /api/v1/inventory/units/{unitId}/media/{mediaId}: updates unit media metadata and visibility; requires inventory.media_update.
- DELETE /api/v1/inventory/units/{unitId}/media/{mediaId}: soft-deletes one unit media record, requests backing object cleanup when storage supports it, and returns the updated listing detail; requires inventory.media_delete.
- POST /api/v1/inventory/units/{unitId}/reserve: reserves a unit, emits reservation_receipt, and creates linked finance entries.
- POST /api/v1/inventory/units/{unitId}/sell: sells a unit, emits sale documents, and creates linked finance entries.
- POST /api/v1/inventory/units/{unitId}/reservation/release: releases a reserved unit, cancels the pending reservation sale/payment, and cancels the pending signal finance entry.
- POST /api/v1/inventory/units/{unitId}/reservation/cancel: operator-cancels a reserved unit, cancels the pending reservation sale/payment, and cancels the pending signal finance entry.
- POST /api/v1/inventory/units/{unitId}/reservation/expire: expires a reserved unit, cancels the pending reservation sale/payment, and cancels the pending signal finance entry.
- PATCH /api/v1/inventory/listings/{listingId}/status: changes non-workflow lifecycle status; requires inventory.update_status.

## Current identity endpoints
- GET /api/v1/session/bootstrap: resolves the authenticated Clerk user, store access, tenant memberships, platform admin flag, and onboarding status.
- POST /api/v1/onboarding/owner-store: creates the first owner store with trial entitlements; validates CNPJ and returns field-level validation issues with requestId on 400.
- POST /api/v1/admin/agencies: creates an agency tenant and optional first-user invitation; requires platform/tenant management access.
- POST /api/v1/agency/stores: creates one store under an active agency tenant; requires agency tenant role and store.manage.
- GET /api/v1/identity/roles: returns agency, owner, supervisor, salesman, and investor role templates, grouped permission catalog, memberships, assignability, base permissions, effective permissions, and overrides.
- POST /api/v1/identity/invitations: creates and sends a store member invitation for owner, supervisor, salesman, or investor roles.
- POST /api/v1/identity/invitations/{invitationId}/resend: resends a pending, failed, sent, or expired identity invitation.
- PATCH /api/v1/identity/memberships/{membershipId}/access: updates one member role and exact allow/deny permission overrides. Agency actors can manage owners; owners can manage supervisors, salespeople, and investors.

## Current billing endpoints
- GET /api/v1/billing/overview: returns plans, subscription status, agency allocations, financial summary, entitlement matrix, store entitlements, and entitlement change events; requires billing.manage.
- GET /api/v1/billing/provider/status: returns Asaas provider readiness without exposing secrets; requires billing.manage.
- PATCH /api/v1/billing/entitlements/{featureKey}: updates one entitlement status with optional reason, writes product entitlement history, and writes critical audit; requires billing.manage.

## Current fiscal endpoints
- GET /api/v1/fiscal/overview: returns SPEDY readiness, NF-e document summary, recent documents, and fiscal events; requires fiscal.manage and nfe entitlement.
- POST /api/v1/fiscal/documents: records one fiscal issue attempt and persists provider status; live SPEDY calls require the future SPEDY HTTP gateway; requires fiscal.manage and nfe entitlement.
- POST /api/v1/fiscal/documents/{documentId}/cancel: records one fiscal cancellation attempt with a reason; live SPEDY calls require the future SPEDY HTTP gateway; requires fiscal.manage and nfe entitlement.
- POST /api/v1/fiscal/documents/{documentId}/status-sync: reconciles one persisted fiscal document status with the configured gateway state; requires fiscal.manage and nfe entitlement.

## Current finance endpoints
- GET /api/v1/finance/summary: returns revenue, expense, pending, and balance totals for the current store; requires finance.read.
- GET /api/v1/finance/entries: lists finance entries with type, status, target link, limit, and offset filters; requires finance.read.
- POST /api/v1/finance/entries: creates one finance entry with optional links and an optional draft document upload request; requires finance.create and finance.attach_document when documentUpload is present.
- GET /api/v1/finance/entries/{entryId}: returns one finance entry with links and attached documents; requires finance.read.
- PATCH /api/v1/finance/entries/{entryId}: updates finance entry fields and can replace entry links; requires finance.update.
- DELETE /api/v1/finance/entries/{entryId}: marks an entry cancelled with an optional reason query parameter; requires finance.update.
- POST /api/v1/finance/entries/{entryId}/pay: marks an entry paid; requires finance.update.
- POST /api/v1/finance/entries/{entryId}/cancel: marks an entry cancelled with JSON reason; requires finance.update.
- POST /api/v1/finance/entries/{entryId}/documents/uploads: returns scoped PUT upload instructions for finance documents; requires finance.attach_document.
- POST /api/v1/finance/entries/{entryId}/documents: attaches an uploaded document to a finance entry; requires finance.attach_document.
- GET /api/v1/finance/recurring-entries and POST /api/v1/finance/recurring-entries: list and create recurring finance entries.
- GET /api/v1/finance/commission-rules and POST /api/v1/finance/commission-rules: list and create commission rules.

## Current analytics endpoints
- GET /api/v1/analytics/dashboard: returns DB-backed inventory, finance, lead funnel, source attribution, and KPI snapshots; requires analytics.read and analytics entitlement.

## Current compliance endpoints
- GET /api/v1/compliance/snapshot: returns LGPD workflow, access review, audit export, retention, provider webhook, and secret-rotation posture; requires compliance.manage and compliance entitlement.

## Current marketplace endpoints
- GET /api/v1/marketplaces/overview: returns OLX/Mercado Livre accounts and recent sync jobs for the current store; requires marketplace entitlement plus marketplace.read.
- POST /api/v1/marketplaces/connect-url: creates the provider OAuth authorization URL for the current store; requires marketplace.manage and provider env configuration.
- POST /api/v1/marketplaces/oauth/complete: exchanges an OAuth code for provider credentials and stores encrypted tokens server-side; requires marketplace.manage.
- PUT /api/v1/marketplaces/integrations/{provider}: creates, activates, pauses, or marks one marketplace account; provider is olx or mercado_livre; requires marketplace.manage.
- POST /api/v1/marketplaces/integrations/{provider}/sync-jobs: queues inventory, lead, publish, update, or unpublish sync jobs after provider setup; requires the matching marketplace permission.
- POST /api/v1/marketplaces/sync-jobs/{jobId}/run: runs one queued provider job, maps the scoped listing payload for publish/update jobs, fails closed before provider IO unless the listing is not deleted, published, public-visible, backed by an eligible unit, and has at least one public photo, allows unpublish from the stored provider external id after the local listing projection is gone, then stores provider external ids and marks the job succeeded or failed.
- Mercado Livre runtime uses OAuth token exchange and item endpoints when MERCADO_LIVRE_CLIENT_ID is configured.
- OLX runtime is partner-configurable through OLX_AUTHORIZATION_URL, OLX_API_BASE_URL, OLX_TOKEN_URL, and OLX_LISTINGS_PATH because public official OLX Brasil API docs were not available in this environment.
- Provider tokens are encrypted at rest with MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY in production and redacted from API responses, docs, audit metadata, and UI state.

## Current documents endpoints
- GET /api/v1/documents: lists shared documents linked to vehicles, leads, sales, finance, and fiscal contexts; requires documents.read.
- GET /api/v1/documents/{documentId}/download: returns a short-lived scoped R2 signed GET descriptor without exposing raw storage keys; accepts optional versionId; requires documents.download.
- GET /api/v1/documents/{documentId}/preview: renders a metadata-based document preview; requires documents.preview.
- GET /api/v1/documents/{documentId}/versions: lists immutable generated versions in newest-first order; requires documents.read.
- PATCH /api/v1/documents/{documentId}: updates title/kind and the primary store/unit link; requires documents.update_metadata and/or documents.update_links for changed fields.
- POST /api/v1/documents/{documentId}/regenerate: renders a new private PDF object, appends an immutable version, and points the document to the latest version; requires documents.regenerate.
- POST /api/v1/documents/{documentId}/void: voids a scoped document with optional reason; requires documents.void.

## Current external API endpoints
- GET /api/v1/external-api/manifest: returns the public API capability manifest with live routes, auth rules, docs URLs, and AI-native discovery URLs.
- GET /api/v1/external-api/ai-tools: returns OpenAI-style tool definitions for vehicle search and lead creation.
- GET /api/v1/external-api/clients: returns scoped API clients and key prefixes; requires external_api.manage.
- POST /api/v1/external-api/clients: creates a scoped API client and returns the plaintext key once; requires external_api.manage.
- POST /api/v1/external-api/clients/{clientId}/revoke: revokes the client and active keys; requires external_api.manage.
- GET /api/v1/external-api/vehicles: lists clean external vehicle DTOs without tenant/store ids, VIN, or full plate fields; requires inventory.read.
- GET /api/v1/external-api/vehicles/search: supports q/search, available, status, price, year, mileage, color, fuel, transmission, and sort aliases for V1-compatible integrations; requires inventory.read.
- GET /api/v1/external-api/vehicles/{listingId}: returns vehicle detail with public media, safe unit refs, price history, and status history; requires inventory.read.
- GET /api/v1/external-api/leads: lists CRM leads by q/search, phone, status, source, listingId, page, and limit; requires lead.read and CRM entitlement.
- POST /api/v1/external-api/leads: creates a CRM lead with V2 buyer fields or V1 aliases name/email/phone/message/vehicleId; requires lead.create, CRM entitlement, and Idempotency-Key.
- GET /api/v1/external-api/leads/{leadId}: returns one lead; requires lead.read and CRM entitlement.
- PATCH /api/v1/external-api/leads/{leadId}: updates lead buyer fields or status; requires lead.update, CRM entitlement, and Idempotency-Key.

## Current internal monitoring endpoints
- GET /api/v1/internal/health: returns scoped admin observability with audit events, health status, alerts, action/outcome/severity metrics, actor activity, and open audit sink failures; requires audit.read.

## Finance side effects
- Vehicle cost, reserve, and sell workflows create finance_entries in the same tenant/store scope.
- Finance rows are linked through finance_entry_links to targets such as vehicle_cost, vehicle_unit, sale, and sale_payment.

## Vehicle document kinds
- Workflow documents include reservation_receipt, sale_contract, sale_receipt, delivery_term, and power_of_attorney.

## External API safety limits
- External API key requests are tenant and store scoped before services run.
- External clients use least-privilege scopes instead of operator roles.
- Mutations require Idempotency-Key and request identifiers for audit correlation.
- Rate limits, payload size limits, and pagination caps are enforced on external API-key requests.
- Destructive operations require explicit delete scopes and audit records.
`;
