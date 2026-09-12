import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { defaultRolePermissions } from "./accessPolicy.js";
import { automationPermissionGroup } from "./automationPermissionCatalog.js";
import { documentPermissionDescriptors } from "./documentPermissionCatalog.js";
import { marketplacePermissionGroup } from "./marketplacePermissionCatalog.js";
import { operationalPermissionGroups } from "./operationalPermissionCatalog.js";
import {
  crmPermissionGroup,
  platformPermissionGroup,
  storefrontPermissionGroup,
} from "./storefrontPermissionCatalog.js";
import { permission, type PermissionGroup } from "./permissionCatalogTypes.js";

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
  {
    key: "commissions",
    label: "Comissões",
    permissions: [
      permission(
        "commissions.read",
        "Visualizar comissões",
        "Consultar regras, apurações e histórico de comissões da loja.",
        "medium",
      ),
      permission(
        "commissions.rules.manage",
        "Gerenciar regras de comissão",
        "Criar, editar e desativar regras usadas para calcular comissões.",
        "high",
      ),
      permission(
        "commissions.settle",
        "Liquidar comissões",
        "Confirmar ou estornar a liquidação financeira de comissões.",
        "high",
      ),
    ],
  },
  automationPermissionGroup,
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
