import { DashboardHome } from "../components/DashboardHome";
import { AppShell } from "../components/AppShell";
import { ModulePlaceholder } from "../components/ModulePlaceholder";
import { BillingModule } from "../features/billing/BillingModule";
import { CrmModule } from "../features/crm/CrmModule";
import { DocumentsModule } from "../features/documents/DocumentsModule";
import { FinanceModule } from "../features/finance/FinanceModule";
import { FiscalModule } from "../features/fiscal/FiscalModule";
import { InventoryListPage } from "../features/inventory/pages/InventoryListPage";
import { MarketplaceModule } from "../features/marketplaces/MarketplaceModule";
import { PublicApiModule } from "../features/publicApi/PublicApiModule";
import { StorefrontCustomizationModule } from "../features/publicSite/StorefrontCustomizationModule";
import { ReportsModule } from "../features/reports/ReportsModule";
import { SalesModule } from "../features/sales/SalesModule";
import { SettingsModule } from "../features/settings/SettingsModule";
import { moduleDefinitions } from "./moduleDefinitions";
import { moduleSurfaceById } from "./moduleRoutes";
import { useModuleState } from "./moduleState";

export function AdminApp() {
  const { activeModuleId, navigate } = useModuleState();
  const activeModule = moduleDefinitions[activeModuleId];
  const activeSurface = moduleSurfaceById[activeModuleId];

  return (
    <AppShell activeModule={activeModule} onNavigate={navigate}>
      {activeSurface === "dashboard" ? (
        <DashboardHome onNavigate={navigate} />
      ) : activeSurface === "inventory" ? (
        <InventoryListPage />
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
        <FinanceModule defaultActiveType="expense" />
      ) : activeSurface === "finance-commissions" ? (
        <FinanceModule defaultActiveType="commission" />
      ) : activeSurface === "storefront-design" ? (
        <StorefrontCustomizationModule key="customize" initialTab="design" />
      ) : activeSurface === "storefront-pages" ? (
        <StorefrontCustomizationModule key="custom-pages" initialTab="pages" />
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
    </AppShell>
  );
}
