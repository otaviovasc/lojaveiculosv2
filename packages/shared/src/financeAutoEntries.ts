export const financeAutoEntryEvents = [
  "vehicle_sale_closed",
  "financing_approved",
  "insurance_issued",
  "transfer_documentation_charged",
  "consortium_sold",
] as const;

export const financeAutoEntryOutputTypes = [
  "expense",
  "revenue",
  "commission",
] as const;

export const financeAutoEntryRuleStatuses = ["active", "inactive"] as const;

export const financeAutoEntryRuleResolutions = [
  "additive",
  "seller_override",
] as const;

export const financeAutoEntryRecipientKinds = [
  "event_seller",
  "fixed_user",
  "none",
] as const;

export const financeAutoEntryFinancingRanks = [
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
] as const;

export const financeAutoEntryPercentageBases = [
  "sale",
  "commission",
  "financing",
  "premium",
  "insurance_commission",
  "documentation",
  "consortium",
] as const;

export const financeAutoEntryTimingKinds = [
  "same_day",
  "days_after",
  "day_of_month",
  "next_month_day",
] as const;

export const financeAutoEntryMaxAmountCents = 2_147_483_647;
export const financeAutoEntryMaxRatePpm = 1_000_000;

export type FinanceAutoEntryEvent = (typeof financeAutoEntryEvents)[number];
export type FinanceAutoEntryOutputType =
  (typeof financeAutoEntryOutputTypes)[number];
export type FinanceAutoEntryRuleStatus =
  (typeof financeAutoEntryRuleStatuses)[number];
export type FinanceAutoEntryRuleResolution =
  (typeof financeAutoEntryRuleResolutions)[number];
export type FinanceAutoEntryRecipientKind =
  (typeof financeAutoEntryRecipientKinds)[number];
export type FinanceAutoEntryFinancingRank =
  (typeof financeAutoEntryFinancingRanks)[number];
export type FinanceAutoEntryPercentageBasis =
  (typeof financeAutoEntryPercentageBases)[number];

export type FinanceAutoEntryRecipient =
  | { kind: "event_seller" }
  | { kind: "fixed_user"; userId: string }
  | { kind: "none" };

export type FinanceAutoEntryEventAttributes = {
  financingRank?: FinanceAutoEntryFinancingRank;
  standardCommissionEnabled?: boolean;
  transferHasLien?: boolean;
};

export type FinanceAutoEntryBasisRangeCondition = {
  basis: FinanceAutoEntryPercentageBasis;
  maxCents?: number | null;
  minCents?: number;
};

export type FinanceAutoEntryRuleConditions = {
  basisRange?: FinanceAutoEntryBasisRangeCondition;
  financingRank?: FinanceAutoEntryFinancingRank;
  standardCommissionEnabled?: boolean;
  transferHasLien?: boolean;
};

export type FinanceAutoEntryCalculation =
  | { amountCents: number; kind: "fixed" }
  | {
      basis: FinanceAutoEntryPercentageBasis;
      basisPoints: number;
      kind: "percentage";
    }
  | {
      basis: FinanceAutoEntryPercentageBasis;
      kind: "rate_ppm";
      ratePpm: number;
    };

export type FinanceAutoEntryTiming =
  | { kind: "same_day" }
  | { days: number; kind: "days_after" }
  | { day: number; kind: "day_of_month" }
  | { day: number; kind: "next_month_day" };

export type FinanceAutoEntryCalculationSnapshot = {
  amountCents: number;
  basisAmountCents: number | null;
  calculation: FinanceAutoEntryCalculation;
  dueAt: string;
  event: FinanceAutoEntryEvent;
  occurredAt: string;
  outputType: FinanceAutoEntryOutputType;
  timing: FinanceAutoEntryTiming;
};
