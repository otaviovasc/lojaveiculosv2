import { Routes, Route } from "react-router-dom";
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
import { InventoryListPage } from "../features/inventory/pages/InventoryListPage";
import { MarketplaceModule } from "../features/marketplaces/MarketplaceModule";
import { PublicApiModule } from "../features/publicApi/PublicApiModule";
import { PublicStorefrontPage } from "../features/publicSite/PublicStorefrontPage";
import { ReportsModule } from "../features/reports/ReportsModule";
import { SettingsModule } from "../features/settings/SettingsModule";
import { moduleDefinitions } from "./moduleDefinitions";
import { useModuleState } from "./moduleState";

// Import Agency Feature Components
import { AgencyLayout } from "../features/agency/AgencyLayout";
import { AgencyDashboardPage } from "../features/agency/pages/AgencyDashboardPage";
import { AgencyStatsPage } from "../features/agency/pages/AgencyStatsPage";
import { AgencyTeamAccessPage } from "../features/agency/pages/AgencyTeamAccessPage";
import { AgencyBillingPage } from "../features/agency/pages/AgencyBillingPage";
import { AgencyCreateStorePage } from "../features/agency/pages/AgencyCreateStorePage";

export function App() {
  const { activeModuleId, navigate } = useModuleState();
  const activeModule = moduleDefinitions[activeModuleId];

  return (
    <Routes>
      {/* Agency Router Group */}
      <Route path="/agency/admin" element={<AgencyLayout />}>
        <Route index element={<AgencyDashboardPage />} />
        <Route path="stats" element={<AgencyStatsPage />} />
        <Route path="team-access" element={<AgencyTeamAccessPage />} />
        <Route path="unified-billing" element={<AgencyBillingPage />} />
        <Route path="create-store" element={<AgencyCreateStorePage />} />
      </Route>

      {/* Store Administrator fallbacks */}
      <Route
        path="*"
        element={
          <AppShell activeModule={activeModule} onNavigate={navigate}>
            {activeModuleId === "dashboard" ? (
              <DashboardHome onNavigate={navigate} />
            ) : activeModuleId === "inventory" ? (
              <InventoryListPage />
            ) : activeModuleId === "customers" ? (
              <CrmModule routeSurface="leads" />
            ) : activeModuleId === "crm" ? (
              <CrmModule routeSurface="whatsapp" />
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
        }
      />
    </Routes>
  );
}
