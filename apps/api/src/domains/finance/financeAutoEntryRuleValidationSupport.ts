import {
  financeAutoEntryFinancingRanks,
  financeAutoEntryMaxAmountCents,
  financeAutoEntryPercentageBases,
  type FinanceAutoEntryRecipient,
  type FinanceAutoEntryRuleConditions,
  type FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";

export function normalizeFinanceAutoEntryConditions(
  conditions: FinanceAutoEntryRuleConditions,
): FinanceAutoEntryRuleConditions {
  if (
    !conditions ||
    typeof conditions !== "object" ||
    Array.isArray(conditions)
  ) {
    throw new FinanceAutoEntryRuleValidationError("conditions is invalid.");
  }
  const normalized: FinanceAutoEntryRuleConditions = {};
  if (conditions.financingRank !== undefined) {
    assertFinanceAutoEntryMember(
      conditions.financingRank,
      financeAutoEntryFinancingRanks,
      "conditions.financingRank",
    );
    normalized.financingRank = conditions.financingRank;
  }
  if (conditions.standardCommissionEnabled !== undefined) {
    if (typeof conditions.standardCommissionEnabled !== "boolean") {
      throw new FinanceAutoEntryRuleValidationError(
        "conditions.standardCommissionEnabled is invalid.",
      );
    }
    normalized.standardCommissionEnabled = conditions.standardCommissionEnabled;
  }
  if (conditions.transferHasLien !== undefined) {
    if (typeof conditions.transferHasLien !== "boolean") {
      throw new FinanceAutoEntryRuleValidationError(
        "conditions.transferHasLien is invalid.",
      );
    }
    normalized.transferHasLien = conditions.transferHasLien;
  }
  if (conditions.basisRange !== undefined) {
    normalized.basisRange = normalizeBasisRange(conditions.basisRange);
  }
  return normalized;
}

export function normalizeFinanceAutoEntryRecipient(
  recipient: FinanceAutoEntryRecipient,
): FinanceAutoEntryRecipient {
  if (recipient.kind === "fixed_user") {
    return {
      kind: "fixed_user",
      userId: normalizeFinanceAutoEntryUuid(
        recipient.userId,
        "recipient.userId",
      ),
    };
  }
  if (recipient.kind === "event_seller" || recipient.kind === "none") {
    return { kind: recipient.kind };
  }
  throw new FinanceAutoEntryRuleValidationError("recipient.kind is invalid.");
}

export function assertFinanceAutoEntryTiming(
  timing: FinanceAutoEntryTiming,
): void {
  if (timing.kind === "same_day") return;
  if (timing.kind === "days_after") {
    assertFinanceAutoEntryIntegerRange(timing.days, 1, 365, "timing.days");
    return;
  }
  if (timing.kind === "day_of_month" || timing.kind === "next_month_day") {
    assertFinanceAutoEntryIntegerRange(timing.day, 1, 31, "timing.day");
    return;
  }
  throw new FinanceAutoEntryRuleValidationError("timing.kind is invalid.");
}

export function normalizeNullableFinanceAutoEntryText(
  value: string | null,
  maxLength: number,
  field: string,
): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new FinanceAutoEntryRuleValidationError(`${field} is invalid.`);
  }
  return normalized;
}

export function normalizeNullableFinanceAutoEntryUuid(
  value: string | null,
  field: string,
): string | null {
  return value === null ? null : normalizeFinanceAutoEntryUuid(value, field);
}

export function assertFinanceAutoEntryIntegerRange(
  value: number,
  minimum: number,
  maximum: number,
  field: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new FinanceAutoEntryRuleValidationError(`${field} is invalid.`);
  }
}

export function assertFinanceAutoEntryMember(
  value: string,
  values: readonly string[],
  field: string,
): void {
  if (!values.includes(value)) {
    throw new FinanceAutoEntryRuleValidationError(`${field} is invalid.`);
  }
}

function normalizeBasisRange(
  range: NonNullable<FinanceAutoEntryRuleConditions["basisRange"]>,
) {
  if (!range || typeof range !== "object" || Array.isArray(range)) {
    throw new FinanceAutoEntryRuleValidationError(
      "conditions.basisRange is invalid.",
    );
  }
  assertFinanceAutoEntryMember(
    range.basis,
    financeAutoEntryPercentageBases,
    "conditions.basisRange.basis",
  );
  if (range.minCents !== undefined) {
    assertFinanceAutoEntryIntegerRange(
      range.minCents,
      0,
      financeAutoEntryMaxAmountCents,
      "conditions.basisRange.minCents",
    );
  }
  if (range.maxCents !== undefined && range.maxCents !== null) {
    assertFinanceAutoEntryIntegerRange(
      range.maxCents,
      0,
      financeAutoEntryMaxAmountCents,
      "conditions.basisRange.maxCents",
    );
  }
  if (
    range.minCents === undefined &&
    (range.maxCents === undefined || range.maxCents === null)
  ) {
    throw new FinanceAutoEntryRuleValidationError(
      "conditions.basisRange requires a finite minimum or maximum.",
    );
  }
  if (
    range.minCents !== undefined &&
    range.maxCents !== undefined &&
    range.maxCents !== null &&
    range.minCents > range.maxCents
  ) {
    throw new FinanceAutoEntryRuleValidationError(
      "conditions.basisRange minimum exceeds maximum.",
    );
  }
  return {
    basis: range.basis,
    ...(range.minCents !== undefined ? { minCents: range.minCents } : {}),
    ...(range.maxCents !== undefined ? { maxCents: range.maxCents } : {}),
  };
}

function normalizeFinanceAutoEntryUuid(value: string, field: string): string {
  const normalized = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new FinanceAutoEntryRuleValidationError(`${field} is invalid.`);
  }
  return normalized;
}

export class FinanceAutoEntryRuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceAutoEntryRuleValidationError";
  }
}
