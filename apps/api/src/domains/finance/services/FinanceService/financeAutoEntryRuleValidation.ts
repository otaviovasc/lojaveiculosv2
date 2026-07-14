import {
  financeAutoEntryEvents,
  financeAutoEntryMaxAmountCents,
  financeAutoEntryMaxRatePpm,
  financeAutoEntryOutputTypes,
  financeAutoEntryPercentageBases,
  financeAutoEntryRuleResolutions,
  financeAutoEntryRuleStatuses,
  type FinanceAutoEntryCalculation,
  type FinanceAutoEntryEvent,
  type FinanceAutoEntryOutputType,
  type FinanceAutoEntryPercentageBasis,
  type FinanceAutoEntryRecipient,
  type FinanceAutoEntryRuleConditions,
  type FinanceAutoEntryRuleResolution,
  type FinanceAutoEntryRuleStatus,
  type FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";
import {
  assertFinanceAutoEntryIntegerRange as assertIntegerRange,
  assertFinanceAutoEntryMember as assertMember,
  assertFinanceAutoEntryTiming as assertTiming,
  FinanceAutoEntryRuleValidationError,
  normalizeFinanceAutoEntryConditions as normalizeConditions,
  normalizeFinanceAutoEntryRecipient as normalizeRecipient,
  normalizeNullableFinanceAutoEntryText as normalizeNullableText,
  normalizeNullableFinanceAutoEntryUuid as normalizeNullableUuid,
} from "../../financeAutoEntryRuleValidationSupport.js";

export { FinanceAutoEntryRuleValidationError } from "../../financeAutoEntryRuleValidationSupport.js";

export type FinanceAutoEntryRuleDefinition = {
  calculation: FinanceAutoEntryCalculation;
  category: string | null;
  conditions: FinanceAutoEntryRuleConditions;
  event: FinanceAutoEntryEvent;
  family: string | null;
  name: string | null;
  outputType: FinanceAutoEntryOutputType;
  priority: number;
  recipient: FinanceAutoEntryRecipient;
  resolution: FinanceAutoEntryRuleResolution;
  ruleKey: string | null;
  sellerUserId: string | null;
  status: FinanceAutoEntryRuleStatus;
  timing: FinanceAutoEntryTiming;
};

export function normalizeFinanceAutoEntryRuleDefinition(
  input: FinanceAutoEntryRuleDefinition,
): FinanceAutoEntryRuleDefinition {
  assertMember(input.event, financeAutoEntryEvents, "event");
  assertMember(input.outputType, financeAutoEntryOutputTypes, "outputType");
  assertMember(input.resolution, financeAutoEntryRuleResolutions, "resolution");
  assertMember(input.status, financeAutoEntryRuleStatuses, "status");
  assertIntegerRange(input.priority, 0, 100, "priority");
  assertCalculation(input.calculation);
  assertTiming(input.timing);

  const ruleKey = normalizeNullableText(input.ruleKey, 191, "ruleKey");
  const normalized: FinanceAutoEntryRuleDefinition = {
    ...input,
    category: normalizeNullableText(input.category, 120, "category"),
    conditions: normalizeConditions(input.conditions),
    family: normalizeNullableText(
      input.family ?? (input.resolution === "seller_override" ? ruleKey : null),
      191,
      "family",
    ),
    name: normalizeNullableText(input.name, 191, "name"),
    recipient: normalizeRecipient(input.recipient),
    ruleKey,
    sellerUserId: normalizeNullableUuid(input.sellerUserId, "sellerUserId"),
  };
  assertEventContract(normalized);
  if (normalized.resolution === "seller_override" && !normalized.family) {
    throw new FinanceAutoEntryRuleValidationError(
      "seller_override rules require family or ruleKey.",
    );
  }
  return normalized;
}

function assertEventContract(input: FinanceAutoEntryRuleDefinition): void {
  if (
    input.event === "vehicle_sale_closed" &&
    input.outputType !== "commission"
  ) {
    throw new FinanceAutoEntryRuleValidationError(
      "vehicle_sale_closed rules must output commission.",
    );
  }

  if (input.calculation.kind !== "fixed") {
    assertEventBasis(input.event, input.calculation.basis, "calculation");
  }
  const {
    basisRange,
    financingRank,
    standardCommissionEnabled,
    transferHasLien,
  } = input.conditions;
  if (basisRange) {
    assertEventBasis(input.event, basisRange.basis, "conditions.basisRange");
  }
  if (financingRank !== undefined && input.event !== "financing_approved") {
    throw new FinanceAutoEntryRuleValidationError(
      "financingRank conditions require financing_approved event.",
    );
  }
  if (
    standardCommissionEnabled !== undefined &&
    input.event !== "vehicle_sale_closed"
  ) {
    throw new FinanceAutoEntryRuleValidationError(
      "standardCommissionEnabled conditions require vehicle_sale_closed event.",
    );
  }
  if (
    (input.family ?? input.ruleKey) === "sale.standard_commission" &&
    standardCommissionEnabled !== true
  ) {
    throw new FinanceAutoEntryRuleValidationError(
      "sale.standard_commission rules require standardCommissionEnabled true.",
    );
  }
  if (
    transferHasLien !== undefined &&
    input.event !== "transfer_documentation_charged"
  ) {
    throw new FinanceAutoEntryRuleValidationError(
      "transferHasLien conditions require transfer_documentation_charged event.",
    );
  }
}

function assertEventBasis(
  event: FinanceAutoEntryEvent,
  basis: FinanceAutoEntryPercentageBasis,
  field: string,
): void {
  const compatibleBases: Record<
    FinanceAutoEntryEvent,
    readonly FinanceAutoEntryPercentageBasis[]
  > = {
    consortium_sold: ["consortium"],
    financing_approved: ["financing"],
    insurance_issued: ["premium", "insurance_commission"],
    transfer_documentation_charged: ["documentation"],
    vehicle_sale_closed: ["sale", "commission"],
  };
  if (!compatibleBases[event].includes(basis)) {
    throw new FinanceAutoEntryRuleValidationError(
      `${event} ${field} must use ${compatibleBases[event].join(" or ")} basis.`,
    );
  }
}

function assertCalculation(calculation: FinanceAutoEntryCalculation): void {
  if (calculation.kind === "fixed") {
    assertIntegerRange(
      calculation.amountCents,
      1,
      financeAutoEntryMaxAmountCents,
      "calculation.amountCents",
    );
    return;
  }
  assertMember(
    calculation.basis,
    financeAutoEntryPercentageBases,
    "calculation.basis",
  );
  if (calculation.kind === "percentage") {
    assertIntegerRange(
      calculation.basisPoints,
      1,
      10_000,
      "calculation.basisPoints",
    );
    return;
  }
  if (calculation.kind === "rate_ppm") {
    assertIntegerRange(
      calculation.ratePpm,
      1,
      financeAutoEntryMaxRatePpm,
      "calculation.ratePpm",
    );
    return;
  }
  throw new FinanceAutoEntryRuleValidationError("calculation.kind is invalid.");
}
