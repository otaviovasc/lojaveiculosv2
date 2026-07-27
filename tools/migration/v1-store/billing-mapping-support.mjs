import { json, nullableString } from "./common.mjs";
import { decimalToCents } from "./money.mjs";

const CORE_FEATURES = ["analytics", "automation", "compliance", "subdomain"];

const PLANS = {
  BASICO: { features: CORE_FEATURES, monthlyPriceCents: 0 },
  PREMIUM: { features: CORE_FEATURES, monthlyPriceCents: 9997 },
  PRO: {
    features: [
      ...CORE_FEATURES,
      "custom_domain",
      "external_api",
      "marketplace",
      "plate_lookup",
      "simulations",
    ],
    monthlyPriceCents: 17990,
  },
  ESTOQUE: {
    features: [
      ...CORE_FEATURES,
      "external_api",
      "marketplace",
      "plate_lookup",
      "simulations",
    ],
    monthlyPriceCents: 14999,
  },
  TOPXCAR: {
    features: [
      ...CORE_FEATURES,
      "external_api",
      "marketplace",
      "plate_lookup",
      "simulations",
    ],
    monthlyPriceCents: 9997,
  },
};

const COMBOS = {
  ESTOQUE_CRM: { addons: ["CRM_WHATSAPP"], basePlan: "ESTOQUE" },
  ESTOQUE_CRM_NFE: {
    addons: ["CRM_WHATSAPP", "SPEDY_NFE"],
    basePlan: "ESTOQUE",
  },
  PRO_CRM: { addons: ["CRM_WHATSAPP"], basePlan: "PRO" },
  PRO_CRM_NFE: {
    addons: ["CRM_WHATSAPP", "SPEDY_NFE"],
    basePlan: "PRO",
  },
  PRO_NFE: { addons: ["SPEDY_NFE"], basePlan: "PRO" },
};

export function resolveLegacyPlan(store, customPlan) {
  const legacyCode = String(store.custom_plan_name ?? store.plano ?? "BASICO")
    .trim()
    .toUpperCase();
  if (customPlan) {
    const features = [...CORE_FEATURES];
    if (customPlan.custom_domain) features.push("custom_domain");
    if (customPlan.api_integrations)
      features.push("external_api", "marketplace");
    if (customPlan.auto_placa_lookup) features.push("plate_lookup");
    return {
      comboAddons: [],
      features,
      isPaid: true,
      legacyCode,
      monthlyPriceCents: decimalToCents(
        customPlan.monthly_price,
        `CustomPlan ${legacyCode} monthly_price`,
      ),
    };
  }
  const combo = COMBOS[legacyCode];
  const baseCode = combo?.basePlan ?? legacyCode;
  const definition = PLANS[baseCode];
  if (!definition)
    throw new Error(`Unsupported V1 billing plan: ${legacyCode}`);
  return {
    comboAddons: combo?.addons ?? [],
    features: [...definition.features],
    isPaid: baseCode !== "BASICO",
    legacyCode,
    monthlyPriceCents: definition.monthlyPriceCents,
  };
}

export function resolveLegacySubscription(store, plan, now) {
  const status = String(store.status_assinatura ?? "ATIVA")
    .trim()
    .toUpperCase();
  const periodEnd = nullableDate(store.plan_end_date);
  const startsAt =
    nullableDate(store.subscription_start_date) ??
    nullableDate(store.data_criacao) ??
    now;
  const inactive = ["CANCELLED", "CANCELED", "INATIVA", "INATIVO"].includes(
    status,
  );
  const explicitlyPastDue = ["OVERDUE", "PAST_DUE"].includes(status);
  const active = ["ACTIVE", "ATIVA"].includes(status);
  if (!inactive && !explicitlyPastDue && !active)
    throw new Error(`Unsupported V1 subscription status: ${status}`);
  const trialing = !plan.isPaid && active && periodEnd && periodEnd > now;
  const expired = !plan.isPaid && active && (!periodEnd || periodEnd <= now);
  const pastDue =
    plan.isPaid &&
    !inactive &&
    (explicitlyPastDue || Boolean(periodEnd && periodEnd <= now));
  const v2Status = inactive
    ? "cancelled"
    : trialing
      ? "trialing"
      : expired
        ? "expired"
        : pastDue
          ? "past_due"
          : "active";
  const hasAccess = !inactive && !expired && (!periodEnd || periodEnd > now);
  return {
    accessEndsAt: periodEnd,
    currentPeriodEnd: periodEnd,
    currentPeriodStart: startsAt,
    entitlementStatus: trialing
      ? "trialing"
      : hasAccess
        ? "active"
        : "inactive",
    hasAccess,
    itemEndsAt: hasAccess ? null : (periodEnd ?? now),
    providerSubscriptionId:
      nullableString(store.asaas_subscription_id, 191) ?? null,
    status: v2Status,
  };
}

export function normalizeLegacyAddons(rows, comboAddons) {
  const addons = rows.map((row) => ({
    ...row,
    addonType: String(row.addonType ?? "")
      .trim()
      .toUpperCase(),
  }));
  for (const addonType of comboAddons) {
    if (addons.some((addon) => addon.addonType === addonType)) continue;
    addons.push({
      activatedAt: null,
      active: true,
      addonType,
      planEndDate: null,
      subscriptionId: null,
      subscriptionStatus: "ACTIVE",
      synthetic: true,
    });
  }
  return addons;
}

export function isLegacyAddonEffective(addon, subscription, now) {
  if (!subscription.hasAccess || !addon.active) return false;
  const status = String(addon.subscriptionStatus ?? "").toUpperCase();
  if (
    ["CANCELLED", "CANCELED", "INACTIVE", "INATIVA", "SUSPENDED"].includes(
      status,
    )
  )
    return false;
  const planEnd = nullableDate(addon.planEndDate);
  return !planEnd || planEnd > now;
}

export function mapLegacyCustomer(store) {
  const user = json(store.user);
  const customization = json(store.customization);
  const contact = json(customization.contact);
  const document = String(
    user.cpfCnpj ?? user.cnpj ?? user.cpf ?? user.document ?? "",
  ).replace(/\D/g, "");
  return {
    documentNumber:
      document.length === 11 || document.length === 14 ? document : null,
    email: nullableString(contact.email ?? user.email, 254),
    providerCustomerId: nullableString(store.asaas_customer_id, 191),
  };
}

export function mapLegacyPayment(row) {
  return {
    amountCents: decimalToCents(row.amount, `Payment ${row.id} amount`),
    createdAt: nullableDate(row.createdAt),
    dueAt: nullableDate(row.dueDate),
    invoiceUrl: nullableString(row.invoiceUrl),
    legacy: {
      amount: String(row.amount),
      billingCycle: nullableString(row.billingCycle, 40),
      description: nullableString(row.description, 500),
      id: row.id,
      method: String(row.method ?? ""),
      plan: nullableString(row.plan, 80),
      type: String(row.type ?? ""),
    },
    paidAt: nullableDate(row.paidAt),
    providerPaymentId: nullableString(row.asaasPaymentId, 191),
    status: mapLegacyPaymentStatus(row.status),
    updatedAt: nullableDate(row.updatedAt),
  };
}

export function mapLegacyPaymentStatus(status) {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (["RECEIVED", "CONFIRMED", "APPROVED", "AUTHORIZED"].includes(normalized))
    return "paid";
  if (normalized === "OVERDUE") return "overdue";
  if (normalized === "REFUNDED" || normalized === "CHARGEBACK")
    return "refunded";
  if (normalized === "CANCELLED" || normalized === "FAILED") return "cancelled";
  if (normalized === "PENDING") return "pending";
  throw new Error(`Unsupported V1 Payment status: ${status}`);
}

export function nullableDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid V1 billing date: ${value}`);
  return date;
}

export function endedAt(addon, now) {
  const end = nullableDate(addon.planEndDate);
  return end && end < now ? end : now;
}
