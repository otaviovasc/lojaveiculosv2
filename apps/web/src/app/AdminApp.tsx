import { Suspense } from "react";
import { DashboardHome } from "../components/DashboardHome";
import { AppShell } from "../components/AppShell";
import { ModulePlaceholder } from "../components/ModulePlaceholder";
import { FeatureLoadingState } from "../components/ui/FeatureStates";
import { PermissionRestrictedPanel } from "../features/account/PermissionRestrictedPanel";
import { useOptionalAccountSession } from "../features/account/accountSession";
import {
  AutoEntriesWorkspace,
  AutomationWorkspace,
  BillingModule,
  BillingUpgradePanel,
  CrmModule,
  DocumentsModule,
  FinanceModule,
  FiscalModule,
  InventoryListPage,
  MarketplaceModule,
  PublicApiModule,
  ReportsModule,
  SalesModule,
  SettingsModule,
  StorefrontCustomizationModule,
} from "./AdminAppLazyModules";
import { moduleDefinitions } from "./moduleDefinitions";
import {
  getModuleEntitlement,
  getModulePermission,
  isActiveStoreAgencyManaged,
  isActiveStoreOwner,
} from "./modulePermissions";
import { moduleSurfaceById } from "./moduleRoutes";
import { useModuleState } from "./moduleState";

export function AdminApp() {
  const { activeModuleId, navigate } = useModuleState();
  const activeModule = moduleDefinitions[activeModuleId];
  const activeSurface = moduleSurfaceById[activeModuleId];
  const accountSession = useOptionalAccountSession();
  const modulePermission = accountSession
    ? getModulePermission(activeModuleId, accountSession)
    : { canView: true, title: "Acesso liberado" };
  const moduleEntitlement = getModuleEntitlement(
    activeModuleId,
    accountSession,
  );
  const owner = isActiveStoreOwner(accountSession);
  const managedByAgency = isActiveStoreAgencyManaged(accountSession);

  return (
    <AppShell activeModule={activeModule} onNavigate={navigate}>
      <Suspense fallback={<FeatureLoadingState title="Carregando módulo" />}>
        {owner && !moduleEntitlement.canUse && moduleEntitlement.featureKey ? (
          <BillingUpgradePanel
            featureKey={moduleEntitlement.featureKey}
            managedByAgency={managedByAgency}
            module={activeModule}
            onOpenBilling={() => navigate("billing")}
          />
        ) : !modulePermission.canView ? (
          <PermissionRestrictedPanel
            title={modulePermission.title}
            {...(modulePermission.description
              ? { description: modulePermission.description }
              : {})}
          />
        ) : activeSurface === "dashboard" ? (
          <DashboardHome onNavigate={navigate} />
        ) : activeSurface === "inventory" ? (
          <InventoryListPage stores={inventoryStoreLinks(accountSession)} />
        ) : activeSurface === "automation" ? (
          <AutomationWorkspace />
        ) : activeSurface === "finance-auto-entries" ? (
          <AutoEntriesWorkspace />
        ) : activeSurface === "crm-leads" ? (
          <CrmModule routeSurface="leads" />
        ) : activeSurface === "sales" ? (
          <SalesModule />
        ) : activeSurface === "crm-whatsapp" ? (
          <CrmModule routeSurface="whatsapp" />
        ) : activeSurface === "billing" ? (
          <BillingModule />
        ) : activeSurface === "documents" ? (
          <DocumentsModule />
        ) : activeSurface === "reports" ? (
          <ReportsModule />
        ) : activeSurface === "finance-expenses" ? (
          <FinanceModule defaultActiveType="expense" onNavigate={navigate} />
        ) : activeSurface === "finance-commissions" ? (
          <FinanceModule defaultActiveType="commission" onNavigate={navigate} />
        ) : activeSurface === "storefront-design" ? (
          <StorefrontCustomizationModule key="customize" initialTab="design" />
        ) : activeSurface === "storefront-pages" ? (
          <StorefrontCustomizationModule
            key="custom-pages"
            initialTab="pages"
          />
        ) : activeSurface === "public-api" ? (
          <PublicApiModule />
        ) : activeSurface === "marketplaces" ? (
          <MarketplaceModule />
        ) : activeSurface === "fiscal" ? (
          <FiscalModule />
        ) : activeSurface === "settings" ? (
          <SettingsModule key="settings" />
        ) : (
          <ModulePlaceholder module={activeModule} />
        )}
      </Suspense>
    </AppShell>
  );
}

function inventoryStoreLinks(
  accountSession: ReturnType<typeof useOptionalAccountSession>,
) {
  if (!accountSession) return [];
  const storesById = new Map<string, { id: string; slug: string }>();
  for (const store of accountSession.stores) {
    storesById.set(store.storeId, {
      id: store.storeId,
      slug: store.storeSlug,
    });
  }
  if (accountSession.defaultStore) {
    storesById.set(accountSession.defaultStore.storeId, {
      id: accountSession.defaultStore.storeId,
      slug: accountSession.defaultStore.storeSlug,
    });
  }
  return [...storesById.values()];
}
