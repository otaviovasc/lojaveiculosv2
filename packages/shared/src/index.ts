export type Brand<K, T> = K & { readonly __brand: T };

export type StoreId = Brand<string, "StoreId">;
export type TenantId = Brand<string, "TenantId">;
export type UserId = Brand<string, "UserId">;
export type VehicleId = Brand<string, "VehicleId">;
export type StoreMembershipId = Brand<string, "StoreMembershipId">;

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { error: E; ok: false };

export type PermissionKey =
  | "audit.read"
  | "billing.manage"
  | "crm.access"
  | "crm.manage"
  | "external_api.manage"
  | "finance.attach_document"
  | "finance.create"
  | "finance.read"
  | "finance.update"
  | "fiscal.manage"
  | "inventory.create"
  | "inventory.catalog_sync"
  | "inventory.cost_create"
  | "inventory.delete"
  | "inventory.document_attach"
  | "inventory.media_delete"
  | "inventory.media_update"
  | "inventory.read"
  | "inventory.reserve"
  | "inventory.sell"
  | "inventory.update_description"
  | "inventory.update_price"
  | "inventory.update_status"
  | "inventory.update_unit"
  | "lead.create"
  | "lead.read"
  | "lead.update"
  | "public_storefront.read"
  | "store.manage"
  | "store_profile.manage"
  | "store_public_site.manage"
  | "tenant.manage"
  | "users.manage";

export type EntitlementKey =
  | "crm"
  | "custom_domain"
  | "external_api"
  | "nfe"
  | "plate_lookup"
  | "subdomain";

export type RoleKey = "agency" | "admin" | "owner" | "salesman" | "supervisor";
