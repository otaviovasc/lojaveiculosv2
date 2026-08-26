import type { BillingCatalogDefinition } from "./billingCatalogDefinition.js";
import { billingCatalog2026_08_v2 } from "./versions/billingCatalog2026_08_v2.js";
import { billingCatalog2026_08_v3 } from "./versions/billingCatalog2026_08_v3.js";

export const currentBillingCatalog: BillingCatalogDefinition =
  billingCatalog2026_08_v3;

export const billingCatalogRegistry: readonly BillingCatalogDefinition[] = [
  billingCatalog2026_08_v2,
  billingCatalog2026_08_v3,
];
