import {
  financeAutoEntryMaxAmountCents,
  type FinanceAutoEntryEvent,
  type FinanceAutoEntryEventAttributes,
  type FinanceAutoEntryPercentageBasis,
  type FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";
import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";

export type FinanceAutoEntryBasisCents = Partial<
  Record<FinanceAutoEntryPercentageBasis, number | null>
>;

export type FinanceAutoEntryEvaluationContext = {
  attributes?: FinanceAutoEntryEventAttributes;
  basisCents?: FinanceAutoEntryBasisCents;
};

export function resolveApplicableFinanceAutoEntryRules(
  rules: readonly FinanceAutoEntryRule[],
  sellerUserId: string | null,
  context: FinanceAutoEntryEvaluationContext = {},
): readonly FinanceAutoEntryRule[] {
  const matching = rules.filter(
    (rule) =>
      rule.status === "active" &&
      (rule.sellerUserId === null || rule.sellerUserId === sellerUserId) &&
      matchesRuleConditions(rule, context),
  );
  const overriddenFamilies = new Set(
    matching
      .filter(
        (rule) =>
          rule.sellerUserId !== null &&
          rule.resolution === "seller_override" &&
          Boolean(ruleFamily(rule)),
      )
      .flatMap((rule) => {
        const family = ruleFamily(rule);
        return family ? [family] : [];
      }),
  );
  return matching
    .filter(
      (rule) =>
        !(
          rule.sellerUserId === null &&
          rule.resolution === "seller_override" &&
          overriddenFamilies.has(ruleFamily(rule) ?? "")
        ),
    )
    .sort(compareRulePriority);
}

function ruleFamily(rule: FinanceAutoEntryRule): string | null {
  return rule.family ?? rule.ruleKey;
}

export function calculateFinanceAutoEntryAmount(
  rule: FinanceAutoEntryRule,
  basisCents: FinanceAutoEntryBasisCents,
): { amountCents: number; basisAmountCents: number | null } {
  if (rule.calculation.kind === "fixed") {
    assertPositiveAmount(rule.calculation.amountCents, rule.id, "fixed");
    return {
      amountCents: rule.calculation.amountCents,
      basisAmountCents: null,
    };
  }

  assertCompatibleEventBasis(rule.event, rule.calculation.basis, rule.id);
  const basisAmountCents = requireValidBasis(
    basisCents,
    rule.calculation.basis,
    rule.id,
  );
  const amountCents =
    rule.calculation.kind === "percentage"
      ? Math.round((basisAmountCents * rule.calculation.basisPoints) / 10_000)
      : Math.round((basisAmountCents * rule.calculation.ratePpm) / 1_000_000);
  assertPositiveAmount(amountCents, rule.id, "calculated");
  return { amountCents, basisAmountCents };
}

export function calculateFinanceAutoEntryDueAt(
  occurredAt: Date,
  timing: FinanceAutoEntryTiming,
): Date {
  assertValidDate(occurredAt);
  if (timing.kind === "same_day") return new Date(occurredAt);
  if (timing.kind === "days_after") {
    const dueAt = new Date(occurredAt);
    dueAt.setUTCDate(dueAt.getUTCDate() + timing.days);
    return dueAt;
  }

  const monthOffset =
    timing.kind === "next_month_day" ||
    (timing.kind === "day_of_month" && timing.day < occurredAt.getUTCDate())
      ? 1
      : 0;
  return dateAtMonthDay(occurredAt, monthOffset, timing.day);
}

function matchesRuleConditions(
  rule: FinanceAutoEntryRule,
  context: FinanceAutoEntryEvaluationContext,
): boolean {
  const attributes = context.attributes ?? {};
  if (
    (ruleFamily(rule) === "sale.standard_commission" &&
      attributes.standardCommissionEnabled !== true) ||
    (rule.conditions.standardCommissionEnabled !== undefined &&
      rule.conditions.standardCommissionEnabled !==
        attributes.standardCommissionEnabled)
  ) {
    return false;
  }
  if (
    rule.conditions.financingRank !== undefined &&
    rule.conditions.financingRank !== attributes.financingRank
  ) {
    return false;
  }
  if (
    rule.conditions.transferHasLien !== undefined &&
    rule.conditions.transferHasLien !== attributes.transferHasLien
  ) {
    return false;
  }
  const range = rule.conditions.basisRange;
  if (!range) return true;
  const amount = context.basisCents?.[range.basis];
  if (
    amount === undefined ||
    amount === null ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > financeAutoEntryMaxAmountCents
  ) {
    return false;
  }
  if (range.minCents !== undefined && amount < range.minCents) return false;
  return !(
    range.maxCents !== undefined &&
    range.maxCents !== null &&
    amount > range.maxCents
  );
}

function assertCompatibleEventBasis(
  event: FinanceAutoEntryEvent,
  basis: FinanceAutoEntryPercentageBasis,
  ruleId: string,
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
    throw new FinanceAutoEntryEvaluationError(
      `Rule ${ruleId} uses a basis incompatible with ${event}.`,
    );
  }
}

function requireValidBasis(
  basisCents: FinanceAutoEntryBasisCents,
  basis: FinanceAutoEntryPercentageBasis,
  ruleId: string,
): number {
  const amount = basisCents[basis];
  if (
    amount === undefined ||
    amount === null ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > financeAutoEntryMaxAmountCents
  ) {
    throw new FinanceAutoEntryEvaluationError(
      `Missing valid ${basis} basis for rule ${ruleId}.`,
    );
  }
  return amount;
}

function assertPositiveAmount(
  amountCents: number,
  ruleId: string,
  source: "calculated" | "fixed",
): void {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > financeAutoEntryMaxAmountCents
  ) {
    throw new FinanceAutoEntryEvaluationError(
      `Rule ${ruleId} has an invalid ${source} amount.`,
    );
  }
}

function dateAtMonthDay(
  source: Date,
  monthOffset: number,
  requestedDay: number,
): Date {
  const monthStart = new Date(source);
  monthStart.setUTCDate(1);
  monthStart.setUTCMonth(monthStart.getUTCMonth() + monthOffset);
  const lastDay = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  monthStart.setUTCDate(Math.min(requestedDay, lastDay));
  return monthStart;
}

function assertValidDate(value: Date): void {
  if (Number.isNaN(value.getTime())) {
    throw new FinanceAutoEntryEvaluationError("occurredAt is invalid.");
  }
}

function compareRulePriority(
  left: FinanceAutoEntryRule,
  right: FinanceAutoEntryRule,
): number {
  return (
    right.priority - left.priority ||
    right.updatedAt.getTime() - left.updatedAt.getTime() ||
    left.id.localeCompare(right.id)
  );
}

export class FinanceAutoEntryEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceAutoEntryEvaluationError";
  }
}
