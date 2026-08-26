import {
  mapLegacyCustomer,
  mapLegacyPayment,
  normalizeLegacyAddons,
  resolveLegacyPlan,
  resolveLegacySubscription,
} from "./billing-mapping-support.mjs";

export { mapLegacyPaymentStatus } from "./billing-mapping-support.mjs";

export const LEGACY_ADDON_MAPPING = {
  CREDERE_SIMULATION: "simulations_pro",
  CRM_WHATSAPP: "crm_core",
  SPEDY_NFE: "fiscal_spedy",
};

const FREE_FEATURES = [
  "storefront",
  "inventory",
  "lead_capture",
  "plate_lookup",
];

export function prepareLegacyBillingMigration(data, now = new Date()) {
  const legacyPlan = resolveLegacyPlan(data.store, data.customPlan);
  const legacySubscription = resolveLegacySubscription(
    data.store,
    legacyPlan,
    now,
  );
  const addons = normalizeLegacyAddons(
    data.addons ?? [],
    legacyPlan.comboAddons,
  );
  for (const addon of addons) {
    const addonType = String(addon.addonType ?? "")
      .trim()
      .toUpperCase();
    if (!LEGACY_ADDON_MAPPING[addonType]) {
      throw new Error(`Unsupported V1 LojaAddon type: ${addonType}`);
    }
  }

  return {
    addons,
    customer: mapLegacyCustomer(data.store),
    entitlements: FREE_FEATURES.map((featureKey) => ({
      active: true,
      endsAt: null,
      featureKey,
      legacyAddons: [],
      sources: ["plan:free"],
      startsAt: now,
      status: "active",
    })),
    legacyContract: {
      plan: legacyPlan,
      subscription: legacySubscription,
    },
    legacyPlan: legacyPlan.legacyCode,
    payments: (data.billingPayments ?? []).map(mapLegacyPayment),
    products: [
      {
        active: true,
        catalogCode: "free",
        endsAt: null,
        itemType: "plan",
        key: "plan:free",
        startsAt: now,
        unitAmountCents: 0,
      },
    ],
    subscription: {
      accessEndsAt: null,
      currentPeriodEnd: null,
      currentPeriodStart: now,
      entitlementStatus: "active",
      hasAccess: true,
      itemEndsAt: null,
      providerSubscriptionId: legacySubscription.providerSubscriptionId,
      status: "active",
    },
  };
}
