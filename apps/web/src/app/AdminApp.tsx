import { Suspense, useEffect } from "react";
import { DashboardHome } from "../components/DashboardHome";
import { AppShell } from "../components/AppShell";
import { ModulePlaceholder } from "../components/ModulePlaceholder";
import { DelayedFallback } from "../components/ui/DelayedFallback";
import { FeatureLoadingState } from "../components/ui/FeatureStates";
import { PermissionRestrictedPanel } from "../features/account/PermissionRestrictedPanel";
import { useOptionalAccountSession } from "../features/account/accountSession";
import { AppErrorBoundary } from "../features/system/AppErrorBoundary";
import { CrmPushProvider } from "../features/crm/push/CrmPushProvider";
import {
  AutoEntriesWorkspace,
  BillingModule,
  BillingUpgradePanel,
  ChecklistModule,
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
  SimulationsPage,
  StorefrontCustomizationModule,
} from "./AdminAppLazyModules";
import { prefetchAdminModules } from "./AdminAppLazyModules";
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
  const canViewAnalytics = accountSession
    ? getModulePermission("reports", accountSession).canView &&
      getModuleEntitlement("reports", accountSession).canUse
    : false;

  useEffect(() => {
    const schedule =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (callback: () => void) => window.setTimeout(callback, 2000);
    schedule(() => prefetchAdminModules());
  }, []);

  return (
    <CrmPushProvider>
      <AppShell activeModule={activeModule} onNavigate={navigate}>
        <AppErrorBoundary layout="fill">
          <Suspense
            fallback={
              <DelayedFallback>
                <FeatureLoadingState
                  title={`Carregando ${activeModule.title}`}
                />
              </DelayedFallback>
            }
          >
            <div className="module-content-enter" key={activeModuleId}>
              {owner &&
              !moduleEntitlement.canUse &&
              moduleEntitlement.featureKey ? (
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
                <DashboardHome
                  canViewAnalytics={canViewAnalytics}
                  onNavigate={navigate}
                />
              ) : activeSurface === "inventory" ? (
                <InventoryListPage
                  stores={inventoryStoreLinks(accountSession)}
                />
              ) : activeSurface === "checklists" ? (
                <ChecklistModule />
              ) : activeSurface === "finance-auto-entries" ? (
                <AutoEntriesWorkspace />
              ) : activeSurface === "crm-leads" ? (
                <CrmModule routeSurface="leads" />
              ) : activeSurface === "sales" ? (
                <SalesModule />
              ) : activeSurface === "crm-whatsapp" ? (
                <CrmModule routeSurface="conversations" />
              ) : activeSurface === "billing" ? (
                <BillingModule />
              ) : activeSurface === "documents" ? (
                <DocumentsModule />
              ) : activeSurface === "reports" ? (
                <ReportsModule />
              ) : activeSurface === "finance-expenses" ? (
                <FinanceModule
                  defaultActiveType="expense"
                  onNavigate={navigate}
                />
              ) : activeSurface === "finance-commissions" ? (
                <FinanceModule
                  defaultActiveType="commission"
                  onNavigate={navigate}
                />
              ) : activeSurface === "storefront-design" ? (
                <StorefrontCustomizationModule
                  key="customize"
                  initialTab="design"
                />
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
              ) : activeSurface === "simulations" ? (
                <SimulationsPage />
              ) : (
                <ModulePlaceholder module={activeModule} />
              )}
            </div>
          </Suspense>
        </AppErrorBoundary>
      </AppShell>
    </CrmPushProvider>
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
