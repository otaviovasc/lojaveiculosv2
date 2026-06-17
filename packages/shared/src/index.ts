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
  | "fiscal.manage"
  | "inventory.create"
  | "inventory.delete"
  | "inventory.read"
  | "inventory.update_description"
  | "inventory.update_price"
  | "store.manage"
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
