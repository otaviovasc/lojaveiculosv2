import type { SaleSellerOption } from "../sales/saleContextOptions";
import { parseMoneyToCents } from "./model";
import { formatDecimal, parsePercentageToRatePpm } from "./numericModel";
import type {
  AutoEntryEvent,
  AutoEntryOutputType,
  AutoEntryPercentageBasis,
  AutoEntryRecipient,
  AutoEntryResolution,
  AutoEntryRule,
  AutoEntryRuleInput,
  AutoEntryRuleMutation,
  AutoEntryRuleStatus,
} from "./types";

export const financingRanks = ["R1", "R2", "R3", "R4", "R5"] as const;
export type FinancingRank = (typeof financingRanks)[number];

export const financingStoreSuggestions: Record<FinancingRank, string> = {
  R1: "1,2",
  R2: "2,4",
  R3: "3,6",
  R4: "4,8",
  R5: "6",
};

export const financingSellerSuggestions: Record<FinancingRank, string> = {
  R1: "0,18",
  R2: "0,36",
  R3: "0,54",
  R4: "0,72",
  R5: "0,9",
};

export const autoEntryFamilies = {
  consortiumSeller: "consortium.seller",
  consortiumStore: "consortium.store",
  financingSeller: "financing.seller",
  financingStore: "financing.store",
  insuranceSeller: "insurance.seller",
  insuranceStore: "insurance.store",
  saleExtraCommission: "sale.extra_commission",
  saleStandardCommission: "sale.standard_commission",
  transferCost: "transfer.cost",
  transferRevenue: "transfer.revenue",
  transferSeller: "transfer.seller",
} as const;

export function sellerSelectOptions(sellers: readonly SaleSellerOption[]) {
  return sellers.map((seller) => ({
    label: `${seller.label} · ${seller.detail}`,
    value: seller.id,
  }));
}

export function findRule(
  rules: readonly AutoEntryRule[],
  ruleKey: string,
  sellerUserId: string | null = null,
) {
  return rules.find(
    (rule) => rule.ruleKey === ruleKey && rule.sellerUserId === sellerUserId,
  );
}

export function familyRules(
  rules: readonly AutoEntryRule[],
  family: string,
  sellerUserId?: string | null,
) {
  return rules.filter(
    (rule) =>
      (rule.family ?? rule.ruleKey) === family &&
      (sellerUserId === undefined || rule.sellerUserId === sellerUserId),
  );
}

export function ruleRateInput(rule: AutoEntryRule | undefined) {
  if (!rule || rule.calculation.kind === "fixed") return "";
  const ppm =
    rule.calculation.kind === "rate_ppm"
      ? rule.calculation.ratePpm
      : rule.calculation.basisPoints * 100;
  return formatRatePpm(ppm);
}

export function ruleMoneyInput(rule: AutoEntryRule | undefined) {
  if (!rule || rule.calculation.kind !== "fixed") return "";
  return formatDecimal(rule.calculation.amountCents / 100);
}

export function parseRatePpm(value: string) {
  return parsePercentageToRatePpm(value);
}

export function formatRatePpm(ratePpm: number) {
  return (ratePpm / 10_000)
    .toFixed(4)
    .replace(/0+$/, "")
    .replace(/\.$/, "")
    .replace(".", ",");
}

export function readPolicyNumber(
  rule: AutoEntryRule | undefined,
  path: readonly string[],
) {
  let current: unknown = rule?.metadata.policy;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" && Number.isFinite(current)
    ? current
    : null;
}

export function toMutation(
  existing: AutoEntryRule | undefined,
  input: AutoEntryRuleInput,
): AutoEntryRuleMutation {
  return { input, ruleId: existing?.id ?? null };
}

export function toStatusMutation(
  existing: AutoEntryRule,
  status: AutoEntryRuleStatus,
): AutoEntryRuleMutation {
  return toMutation(existing, {
    calculation: existing.calculation,
    category: existing.category,
    conditions: existing.conditions ?? {},
    event: existing.event,
    family: existing.family ?? null,
    metadata: existing.metadata,
    name: existing.name,
    outputType: existing.outputType,
    priority: existing.priority,
    recipient: existing.recipient ?? { kind: "event_seller" },
    resolution: existing.resolution ?? "additive",
    ruleKey: existing.ruleKey ?? null,
    sellerUserId: existing.sellerUserId,
    status,
    timing: existing.timing,
  });
}

export function rateRule({
  basis,
  event,
  family,
  name,
  outputType,
  ratePpm,
  recipient,
  resolution,
  ruleKey,
  sellerUserId = null,
}: {
  basis: AutoEntryPercentageBasis;
  event: AutoEntryEvent;
  family: string;
  name: string;
  outputType: AutoEntryOutputType;
  ratePpm: number;
  recipient: AutoEntryRecipient;
  resolution: AutoEntryResolution;
  ruleKey: string;
  sellerUserId?: string | null;
}): AutoEntryRuleInput {
  return {
    calculation: { basis, kind: "rate_ppm", ratePpm },
    category: outputType === "commission" ? "Comissão" : name.split(" ")[0]!,
    conditions: {},
    event,
    family,
    metadata: {},
    name,
    outputType,
    priority: 0,
    recipient,
    resolution,
    ruleKey,
    sellerUserId,
    status: "active",
    timing: { kind: "same_day" },
  };
}

export function validMoney(value: string) {
  const cents = parseMoneyToCents(value);
  return cents !== null && cents > 0 ? cents : null;
}

export function sellerName(
  sellers: readonly SaleSellerOption[],
  sellerUserId: string | null,
) {
  return (
    sellers.find((seller) => seller.id === sellerUserId)?.label ??
    "Vendedor não encontrado"
  );
}
