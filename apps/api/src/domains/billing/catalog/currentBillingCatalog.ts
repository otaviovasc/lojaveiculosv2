import type { BillingCatalogDefinition } from "./billingCatalogDefinition.js";
import { billingCatalog2026_08_v2 } from "./versions/billingCatalog2026_08_v2.js";

export const currentBillingCatalog: BillingCatalogDefinition =
  billingCatalog2026_08_v2;

export const billingCatalogRegistry: readonly BillingCatalogDefinition[] = [
  billingCatalog2026_08_v2,
];
