import { lazy } from "react";
import { withMinimumVisibleTime } from "../components/ui/DelayedFallback";

const loadAutoEntriesWorkspace = () =>
  import("../features/autoEntries/AutoEntriesWorkspace").then((module) => ({
    default: module.AutoEntriesWorkspace,
  }));
const loadBillingModule = () =>
  import("../features/billing/BillingModule").then((module) => ({
    default: module.BillingModule,
  }));
const loadBillingUpgradePanel = () =>
  import("../features/billing/BillingUpgradePanel").then((module) => ({
    default: module.BillingUpgradePanel,
  }));
const loadChecklistModule = () =>
  import("../features/checklists/ChecklistModule").then((module) => ({
    default: module.ChecklistModule,
  }));
const loadCrmModule = () =>
  import("../features/crm/CrmModule").then((module) => ({
    default: module.CrmModule,
  }));
const loadDocumentsModule = () =>
  import("../features/documents/DocumentsModule").then((module) => ({
    default: module.DocumentsModule,
  }));
const loadFinanceModule = () =>
  import("../features/finance/FinanceModule").then((module) => ({
    default: module.FinanceModule,
  }));
const loadFiscalModule = () =>
  import("../features/fiscal/FiscalModule").then((module) => ({
    default: module.FiscalModule,
  }));
const loadInventoryListPage = () =>
  import("../features/inventory/pages/InventoryListPage").then((module) => ({
    default: module.InventoryListPage,
  }));
const loadMarketplaceModule = () =>
  import("../features/marketplaces/MarketplaceModule").then((module) => ({
    default: module.MarketplaceModule,
  }));
const loadPublicApiModule = () =>
  import("../features/publicApi/PublicApiModule").then((module) => ({
    default: module.PublicApiModule,
  }));
const loadReportsModule = () =>
  import("../features/reports/ReportsModule").then((module) => ({
    default: module.ReportsModule,
  }));
const loadSalesModule = () =>
  import("../features/sales/SalesModule").then((module) => ({
    default: module.SalesModule,
  }));
const loadSettingsModule = () =>
  import("../features/settings/SettingsModule").then((module) => ({
    default: module.SettingsModule,
  }));
const loadSimulationsPage = () =>
  import("../features/simulations/SimulationsPage").then((module) => ({
    default: module.SimulationsPage,
  }));
const loadStorefrontCustomizationModule = () =>
  import("../features/publicSite/StorefrontCustomizationModule").then(
    (module) => ({ default: module.StorefrontCustomizationModule }),
  );

// Loaders get a minimum visible window so the loading panel never flashes
// in and out on medium-slow chunk loads; instant loads stay instant.
export const AutoEntriesWorkspace = lazy(
  withMinimumVisibleTime(loadAutoEntriesWorkspace),
);
export const BillingModule = lazy(withMinimumVisibleTime(loadBillingModule));
export const BillingUpgradePanel = lazy(
  withMinimumVisibleTime(loadBillingUpgradePanel),
);
export const ChecklistModule = lazy(
  withMinimumVisibleTime(loadChecklistModule),
);
export const CrmModule = lazy(withMinimumVisibleTime(loadCrmModule));
export const DocumentsModule = lazy(
  withMinimumVisibleTime(loadDocumentsModule),
);
export const FinanceModule = lazy(withMinimumVisibleTime(loadFinanceModule));
export const FiscalModule = lazy(withMinimumVisibleTime(loadFiscalModule));
export const InventoryListPage = lazy(
  withMinimumVisibleTime(loadInventoryListPage),
);
export const MarketplaceModule = lazy(
  withMinimumVisibleTime(loadMarketplaceModule),
);
export const PublicApiModule = lazy(
  withMinimumVisibleTime(loadPublicApiModule),
);
export const ReportsModule = lazy(withMinimumVisibleTime(loadReportsModule));
export const SalesModule = lazy(withMinimumVisibleTime(loadSalesModule));
export const SettingsModule = lazy(withMinimumVisibleTime(loadSettingsModule));
export const SimulationsPage = lazy(
  withMinimumVisibleTime(loadSimulationsPage),
);
export const StorefrontCustomizationModule = lazy(
  withMinimumVisibleTime(loadStorefrontCustomizationModule),
);

/**
 * Warms every module chunk during browser idle time so later module switches
 * resolve before the fallback delay elapses and never show a loading card.
 */
export function prefetchAdminModules() {
  const loaders = [
    loadAutoEntriesWorkspace,
    loadBillingModule,
    loadBillingUpgradePanel,
    loadChecklistModule,
    loadCrmModule,
    loadDocumentsModule,
    loadFinanceModule,
    loadFiscalModule,
    loadInventoryListPage,
    loadMarketplaceModule,
    loadPublicApiModule,
    loadReportsModule,
    loadSalesModule,
    loadSettingsModule,
    loadSimulationsPage,
    loadStorefrontCustomizationModule,
  ];
  for (const load of loaders) {
    // Chunk graphs are cached by the bundler; failures here are non-fatal
    // because the lazy boundary retries on real navigation.
    void load().catch(() => undefined);
  }
}
