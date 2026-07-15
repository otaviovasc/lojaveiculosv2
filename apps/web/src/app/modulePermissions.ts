import type { SessionBootstrap } from "../features/account/apiClient";
import {
  readSessionActiveStore,
  readSessionEffectivePermissions,
} from "../features/account/sessionPermissions";
import {
  navigationGroups,
  type ModuleId,
  type NavigationGroup,
  type NavigationItem,
} from "./modules";

type ModulePermission = {
  canView: boolean;
  description?: string;
  title: string;
};

type ModulePermissionRule = {
  description: string;
  mode?: "all" | "any";
  permissions: readonly string[];
};

const modulePermissionRules: Partial<Record<ModuleId, ModulePermissionRule>> = {
  "auto-entries": gate(["finance.read"], "regras de lançamentos automáticos"),
  autobot: gate(["automation.read"], "automações assistidas"),
  billing: gate(["billing.manage"], "assinatura e faturamento"),
  checklists: gate(["inventory.checklist_read"], "checklists"),
  commissions: gate(["finance.read"], "comissões"),
  crm: gate(
    ["crm.access", "crm.whatsapp.list"],
    "WhatsApp e atendimento",
    "any",
  ),
  "custom-pages": gate(["store_public_site.manage"], "páginas da vitrine"),
  customers: gate(["lead.read"], "clientes"),
  documents: gate(["documents.read"], "documentos"),
  domain: gate(["store_public_site.manage"], "domínio da loja"),
  expenses: gate(["finance.read"], "gastos"),
  fiscal: gate(["fiscal.manage"], "emissão fiscal"),
  inventory: gate(["inventory.read"], "estoque"),
  marketplaces: gate(["marketplace.read"], "marketplaces"),
  "paid-traffic": gate(["analytics.read"], "tráfego pago"),
  "public-api": gate(["external_api.manage"], "API pública"),
  "public-site": gate(["store_public_site.manage"], "vitrine digital"),
  reports: gate(["analytics.read"], "relatórios"),
  sales: gate(["sale.read"], "vendas"),
  simulations: gate(["sale.read"], "simulações"),
  settings: gate(
    ["store_profile.manage", "store_public_site.manage", "users.manage"],
    "configurações e permissões",
    "any",
  ),
};

export function getModulePermission(
  moduleId: ModuleId,
  session: SessionBootstrap,
): ModulePermission {
  const rule = modulePermissionRules[moduleId];
  if (!rule || hasModulePermissions(session, rule)) {
    return { canView: true, title: "Acesso liberado" };
  }

  return {
    canView: false,
    description: `Seu perfil não tem acesso a ${rule.description}. Use os módulos liberados no menu ou peça ajuste de permissão a um gestor.`,
    title: "Acesso restrito",
  };
}

export function filterNavigationGroups(
  groups: readonly NavigationGroup[],
  session: SessionBootstrap | null,
) {
  if (!session) return groups;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canShowNavigationItem(item, session)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getModuleEntitlement(
  moduleId: ModuleId,
  session: SessionBootstrap | null,
) {
  const item = navigationItem(moduleId);
  const featureKey = item?.entitlementKey ?? null;
  if (!featureKey || !session) return { canUse: true, featureKey };
  const entitlements = readSessionActiveStore(session)?.entitlements;
  return {
    canUse: !entitlements || entitlements.includes(featureKey),
    featureKey,
  };
}

export function isActiveStoreOwner(session: SessionBootstrap | null) {
  return readSessionActiveStore(session)?.role === "owner";
}

export function isActiveStoreAgencyManaged(session: SessionBootstrap | null) {
  return readSessionActiveStore(session)?.billingManagedBy === "agency";
}

function canShowNavigationItem(
  item: NavigationItem,
  session: SessionBootstrap,
) {
  const store = readSessionActiveStore(session);
  if (store?.role === "owner") {
    return item.id !== "billing" || store.billingManagedBy !== "agency";
  }
  return (
    getModulePermission(item.id, session).canView &&
    hasModuleEntitlement(item, session)
  );
}

function navigationItem(moduleId: ModuleId) {
  return navigationGroups
    .flatMap((group) => group.items)
    .find((item) => item.id === moduleId);
}

function gate(
  permissions: readonly string[],
  description: string,
  mode: ModulePermissionRule["mode"] = "all",
): ModulePermissionRule {
  return { description, mode, permissions };
}

function hasModulePermissions(
  session: SessionBootstrap,
  rule: ModulePermissionRule,
) {
  const permissions = readSessionEffectivePermissions(session);
  if (!permissions) return true;
  const granted = new Set(permissions);
  const check = (permission: string) => granted.has(permission);
  return rule.mode === "any"
    ? rule.permissions.some(check)
    : rule.permissions.every(check);
}

function hasModuleEntitlement(item: NavigationItem, session: SessionBootstrap) {
  if (!item.entitlementKey) return true;
  const entitlements = readSessionActiveStore(session)?.entitlements;
  if (!entitlements) return true;
  return entitlements.includes(item.entitlementKey);
}
