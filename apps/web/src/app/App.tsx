import { DashboardHome } from "../components/DashboardHome";
import { AppShell } from "../components/AppShell";
import { ModulePlaceholder } from "../components/ModulePlaceholder";
import { CrmModule } from "../features/crm/CrmModule";
import { BillingModule } from "../features/billing/BillingModule";
import { ComplianceModule } from "../features/compliance/ComplianceModule";
import { DocumentsModule } from "../features/documents/DocumentsModule";
import { FinanceModule } from "../features/finance/FinanceModule";
import { FiscalModule } from "../features/fiscal/FiscalModule";
import { InternalHealthModule } from "../features/internalHealth/InternalHealthModule";
import { InventoryCreatePage } from "../features/inventory/pages/InventoryCreatePage";
import { MarketplaceModule } from "../features/marketplaces/MarketplaceModule";
import { PublicApiModule } from "../features/publicApi/PublicApiModule";
import { PublicStorefrontPage } from "../features/publicSite/PublicStorefrontPage";
import { ReportsModule } from "../features/reports/ReportsModule";
import { SettingsModule } from "../features/settings/SettingsModule";
import { moduleDefinitions } from "./moduleDefinitions";
import { useModuleState } from "./moduleState";

export function App() {
  const { activeModuleId, navigate } = useModuleState();
  const activeModule = moduleDefinitions[activeModuleId];

  return (
    <AppShell activeModule={activeModule} onNavigate={navigate}>
      {activeModuleId === "dashboard" ? (
        <DashboardHome onNavigate={navigate} />
      ) : activeModuleId === "inventory" ? (
        <InventoryCreatePage />
      ) : activeModuleId === "crm" ? (
        <CrmModule />
      ) : activeModuleId === "billing" ? (
        <BillingModule />
      ) : activeModuleId === "documents" ? (
        <DocumentsModule />
      ) : activeModuleId === "reports" ? (
        <ReportsModule />
      ) : activeModuleId === "expenses" ? (
        <FinanceModule defaultActiveType="expense" />
      ) : activeModuleId === "commissions" ? (
        <FinanceModule defaultActiveType="commission" />
      ) : activeModuleId === "public-site" ? (
        <PublicStorefrontPage />
      ) : activeModuleId === "public-api" ? (
        <PublicApiModule />
      ) : activeModuleId === "marketplaces" ? (
        <MarketplaceModule />
      ) : activeModuleId === "fiscal" ? (
        <FiscalModule />
      ) : activeModuleId === "compliance" ? (
        <ComplianceModule />
      ) : activeModuleId === "internal-health" ? (
        <InternalHealthModule />
      ) : activeModuleId === "settings" ? (
        <SettingsModule />
      ) : (
        <ModulePlaceholder module={activeModule} />
      )}
    </AppShell>
  );
}
