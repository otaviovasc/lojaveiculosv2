import { lazy } from "react";

export const AutomationWorkspace = lazy(() =>
  import("../features/automation/AutomationWorkspace").then((module) => ({
    default: module.AutomationWorkspace,
  })),
);
export const AutoEntriesWorkspace = lazy(() =>
  import("../features/autoEntries/AutoEntriesWorkspace").then((module) => ({
    default: module.AutoEntriesWorkspace,
  })),
);
export const BillingModule = lazy(() =>
  import("../features/billing/BillingModule").then((module) => ({
    default: module.BillingModule,
  })),
);
export const CrmModule = lazy(() =>
  import("../features/crm/CrmModule").then((module) => ({
    default: module.CrmModule,
  })),
);
export const DocumentsModule = lazy(() =>
  import("../features/documents/DocumentsModule").then((module) => ({
    default: module.DocumentsModule,
  })),
);
export const FinanceModule = lazy(() =>
  import("../features/finance/FinanceModule").then((module) => ({
    default: module.FinanceModule,
  })),
);
export const FiscalModule = lazy(() =>
  import("../features/fiscal/FiscalModule").then((module) => ({
    default: module.FiscalModule,
  })),
);
export const InventoryListPage = lazy(() =>
  import("../features/inventory/pages/InventoryListPage").then((module) => ({
    default: module.InventoryListPage,
  })),
);
export const MarketplaceModule = lazy(() =>
  import("../features/marketplaces/MarketplaceModule").then((module) => ({
    default: module.MarketplaceModule,
  })),
);
export const PublicApiModule = lazy(() =>
  import("../features/publicApi/PublicApiModule").then((module) => ({
    default: module.PublicApiModule,
  })),
);
export const ReportsModule = lazy(() =>
  import("../features/reports/ReportsModule").then((module) => ({
    default: module.ReportsModule,
  })),
);
export const SalesModule = lazy(() =>
  import("../features/sales/SalesModule").then((module) => ({
    default: module.SalesModule,
  })),
);
export const SettingsModule = lazy(() =>
  import("../features/settings/SettingsModule").then((module) => ({
    default: module.SettingsModule,
  })),
);
export const StorefrontCustomizationModule = lazy(() =>
  import("../features/publicSite/StorefrontCustomizationModule").then(
    (module) => ({ default: module.StorefrontCustomizationModule }),
  ),
);
