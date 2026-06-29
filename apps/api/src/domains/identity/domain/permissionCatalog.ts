import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { defaultRolePermissions } from "./accessPolicy.js";
import { documentPermissionDescriptors } from "./documentPermissionCatalog.js";
import { marketplacePermissionGroup } from "./marketplacePermissionCatalog.js";
import { operationalPermissionGroups } from "./operationalPermissionCatalog.js";
import {
  crmPermissionGroup,
  platformPermissionGroup,
  storefrontPermissionGroup,
} from "./storefrontPermissionCatalog.js";
import type { PermissionGroup } from "./permissionCatalogTypes.js";

export type {
  PermissionDescriptor,
  PermissionGroup,
  PermissionRisk,
} from "./permissionCatalogTypes.js";

export const assignableRoleKeys = [
  "investor",
  "owner",
  "supervisor",
  "salesman",
] satisfies RoleKey[];
export const visibleRoleKeys = [
  "agency",
  "investor",
  "owner",
  "supervisor",
  "salesman",
] satisfies RoleKey[];

export const permissionGroups: readonly PermissionGroup[] = [
  ...operationalPermissionGroups,
  crmPermissionGroup,
  storefrontPermissionGroup,
  marketplacePermissionGroup,
  {
    key: "documents",
    label: "Contratos e Documentos",
    permissions: documentPermissionDescriptors,
  },
  platformPermissionGroup,
] as const;

export function getDefaultPermissions(role: RoleKey): readonly PermissionKey[] {
  return defaultRolePermissions[role] ?? [];
}
