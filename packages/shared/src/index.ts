export type Brand<K, T> = K & { readonly __brand: T };

export type StoreId = Brand<string, "StoreId">;
export type TenantId = Brand<string, "TenantId">;
export type UserId = Brand<string, "UserId">;
export type VehicleId = Brand<string, "VehicleId">;
export type StoreMembershipId = Brand<string, "StoreMembershipId">;

export type Result<T, E = string> =
  { ok: true; value: T } | { error: E; ok: false };

export type PermissionKey =
  | "audit.read"
  | "analytics.read"
  | "billing.manage"
  | "billing.webhook.ingest"
  | "compliance.manage"
  | "crm.access"
  | "crm.manage"
  | "crm.whatsapp.assign"
  | "crm.pipeline.manage"
  | "crm.pipeline.move"
  | "crm.pipeline.read"
  | "crm.visits.manage"
  | "crm.visits.read"
  | "crm.whatsapp.close"
  | "crm.whatsapp.campaigns.manage"
  | "crm.whatsapp.campaigns.read"
  | "crm.whatsapp.connection.manage"
  | "crm.whatsapp.ingest"
  | "crm.whatsapp.integrations.manage"
  | "crm.whatsapp.list"
  | "crm.whatsapp.read"
  | "crm.whatsapp.schedules.cancel"
  | "crm.whatsapp.schedules.create"
  | "crm.whatsapp.schedules.process"
  | "crm.whatsapp.schedules.read"
  | "crm.whatsapp.send"
  | "crm.whatsapp.tags.assign"
  | "crm.whatsapp.tags.manage"
  | "crm.whatsapp.toggle_intervention"
  | "documents.read"
  | "documents.download"
  | "documents.preview"
  | "documents.regenerate"
  | "documents.template_update"
  | "documents.update_links"
  | "documents.update_metadata"
  | "documents.upload"
  | "documents.void"
  | "external_api.manage"
  | "finance.attach_document"
  | "finance.create"
  | "finance.read"
  | "finance.update"
  | "fiscal.manage"
  | "identity.owner_store.create"
  | "identity.session.bootstrap"
  | "inventory.create"
  | "inventory.catalog_sync"
  | "inventory.checklist_read"
  | "inventory.checklist_update"
  | "inventory.cost_create"
  | "inventory.delete"
  | "inventory.document_attach"
  | "inventory.media_delete"
  | "inventory.media_update"
  | "inventory.read"
  | "inventory.reserve"
  | "inventory.sell"
  | "inventory.update_description"
  | "inventory.update_internal_notes"
  | "inventory.update_price"
  | "inventory.update_status"
  | "inventory.update_unit"
  | "lead.create"
  | "lead.read"
  | "lead.update"
  | "marketplace.inventory_sync"
  | "marketplace.lead_sync"
  | "marketplace.listing_publish"
  | "marketplace.listing_unpublish"
  | "marketplace.listing_update"
  | "marketplace.manage"
  | "marketplace.read"
  | "public_storefront.lead_create"
  | "public_storefront.read"
  | "sale.cancel"
  | "sale.close"
  | "sale.correct"
  | "sale.draft"
  | "sale.override_required_fields"
  | "sale.read"
  | "sale.reserve"
  | "store.manage"
  | "store_profile.manage"
  | "store_public_site.manage"
  | "tenant.manage"
  | "users.manage";

export type EntitlementKey =
  | "analytics"
  | "compliance"
  | "crm"
  | "custom_domain"
  | "external_api"
  | "marketplace"
  | "nfe"
  | "plate_lookup"
  | "subdomain";

export type RoleKey =
  "agency" | "admin" | "investor" | "owner" | "salesman" | "supervisor";

export * from "./brazilianDocuments.js";
export * from "./vehicleColors.js";
export * from "./vehicleTechnicalSpecs.js";
export * from "./storefrontBuilder.js";
export * from "./storefrontMedia.js";
