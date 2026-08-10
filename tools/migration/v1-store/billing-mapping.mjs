import {
  endedAt,
  isLegacyAddonEffective,
  mapLegacyCustomer,
  mapLegacyPayment,
  normalizeLegacyAddons,
  nullableDate,
  resolveLegacyPlan,
  resolveLegacySubscription,
} from "./billing-mapping-support.mjs";

export { mapLegacyPaymentStatus } from "./billing-mapping-support.mjs";

export const LEGACY_ADDON_MAPPING = {
  CREDERE_SIMULATION: {
    catalogCode: "simulations_pro",
    featureKey: "simulations",
    monthlyPriceCents: 10000,
  },
  CRM_WHATSAPP: {
    catalogCode: "crm_core",
    featureKey: "crm",
    monthlyPriceCents: 17900,
  },
  SPEDY_NFE: {
    catalogCode: "fiscal_spedy",
    featureKey: "fiscal",
    monthlyPriceCents: 3500,
  },
};

const BUNDLED_ADDONS = {
  external_api: "public_api_access",
  marketplace: "marketplace_connectors",
  simulations: "simulations_pro",
};

export function prepareLegacyBillingMigration(data, now = new Date()) {
  const plan = resolveLegacyPlan(data.store, data.customPlan);
  const subscription = resolveLegacySubscription(data.store, plan, now);
  const addons = normalizeLegacyAddons(data.addons ?? [], plan.comboAddons);
  const products = new Map();
  const entitlements = new Map();

  for (const featureKey of plan.features) {
    mergeEntitlement(entitlements, {
      active: subscription.hasAccess,
      endsAt: subscription.accessEndsAt,
      featureKey,
      source: `plan:${plan.legacyCode}`,
      startsAt: subscription.currentPeriodStart,
      status: subscription.entitlementStatus,
    });
  }

  if (plan.isPaid) {
    products.set("plan:growth", {
      active: subscription.hasAccess,
      catalogCode: "growth",
      endsAt: subscription.itemEndsAt,
      itemType: "plan",
      key: "plan:growth",
      startsAt: subscription.currentPeriodStart,
      unitAmountCents: plan.monthlyPriceCents,
    });
    for (const featureKey of plan.features) {
      const catalogCode = BUNDLED_ADDONS[featureKey];
      if (!catalogCode) continue;
      products.set(`addon:${catalogCode}`, {
        active: subscription.hasAccess,
        catalogCode,
        endsAt: subscription.itemEndsAt,
        itemType: "addon",
        key: `addon:${catalogCode}`,
        startsAt: subscription.currentPeriodStart,
        unitAmountCents: 0,
      });
    }
  }

  for (const addon of addons) {
    const mapping = LEGACY_ADDON_MAPPING[addon.addonType];
    if (!mapping)
      throw new Error(`Unsupported V1 LojaAddon type: ${addon.addonType}`);
    const effective = isLegacyAddonEffective(addon, subscription, now);
    mergeEntitlement(entitlements, {
      active: effective,
      endsAt: effective ? nullableDate(addon.planEndDate) : endedAt(addon, now),
      featureKey: mapping.featureKey,
      legacyAddon: addon.synthetic ? null : addon,
      source: `addon:${addon.addonType}`,
      startsAt:
        nullableDate(addon.activatedAt) ?? subscription.currentPeriodStart,
      status: effective ? "active" : "inactive",
    });
    products.set(`addon:${mapping.catalogCode}`, {
      active: effective,
      catalogCode: mapping.catalogCode,
      endsAt: effective ? null : endedAt(addon, now),
      itemType: "addon",
      key: `addon:${mapping.catalogCode}`,
      legacyAddon: addon.synthetic ? null : addon,
      startsAt:
        nullableDate(addon.activatedAt) ?? subscription.currentPeriodStart,
      unitAmountCents: mapping.monthlyPriceCents,
    });
  }

  return {
    addons,
    customer: mapLegacyCustomer(data.store),
    entitlements: [...entitlements.values()],
    legacyPlan: plan.legacyCode,
    payments: (data.billingPayments ?? []).map(mapLegacyPayment),
    products: [...products.values()],
    subscription,
  };
}

function mergeEntitlement(target, input) {
  const current = target.get(input.featureKey);
  const sources = [...(current?.sources ?? []), input.source];
  const legacyAddons = [
    ...(current?.legacyAddons ?? []),
    ...(input.legacyAddon ? [input.legacyAddon] : []),
  ];
  const active = Boolean(current?.active || input.active);
  target.set(input.featureKey, {
    active,
    endsAt: active
      ? current?.active
        ? current.endsAt
        : input.endsAt
      : input.endsAt,
    featureKey: input.featureKey,
    legacyAddons,
    sources,
    startsAt: earliestDate(current?.startsAt, input.startsAt),
    status: active
      ? current?.active
        ? current.status
        : input.status
      : (current?.status ?? input.status),
  });
}

function earliestDate(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left <= right ? left : right;
}
