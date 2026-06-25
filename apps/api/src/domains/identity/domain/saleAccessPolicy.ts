import type { PermissionKey } from "@lojaveiculosv2/shared";

export const saleLifecyclePermissions = [
  "sale.cancel",
  "sale.close",
  "sale.correct",
  "sale.draft",
  "sale.override_required_fields",
  "sale.read",
  "sale.reserve",
] satisfies PermissionKey[];

export const saleSellerPermissions = [
  "sale.draft",
  "sale.read",
  "sale.reserve",
] satisfies PermissionKey[];

export const saleSupervisorPermissions = [
  "sale.close",
  "sale.correct",
  ...saleSellerPermissions,
] satisfies PermissionKey[];
