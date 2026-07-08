import type { SessionBootstrap } from "../features/account/apiClient";
import { readRuntimeStoreSlug } from "../features/account/currentStore";
import type { ModuleId, NavigationGroup, NavigationItem } from "./modules";

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
  "auto-entries": gate(["finance.read"], "lançamentos financeiros"),
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

function canShowNavigationItem(
  item: NavigationItem,
  session: SessionBootstrap,
) {
  return getModulePermission(item.id, session).canView;
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
  const permissions = selectPermissionStore(session)?.effectivePermissions;
  if (!permissions) return true;
  const granted = new Set(permissions);
  const check = (permission: string) => granted.has(permission);
  return rule.mode === "any"
    ? rule.permissions.some(check)
    : rule.permissions.every(check);
}

function selectPermissionStore(session: SessionBootstrap) {
  const runtimeStoreSlug = readRuntimeStoreSlug(
    undefined,
    session.user.clerkUserId,
  );
  const activeStores = session.stores.filter(
    (store) => store.status === "active",
  );
  return (
    activeStores.find((store) => store.storeSlug === runtimeStoreSlug) ??
    (session.defaultStore?.status === "active" ? session.defaultStore : null) ??
    activeStores[0] ??
    null
  );
}
