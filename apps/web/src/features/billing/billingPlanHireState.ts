import type { BillingPlanHire } from "./types";

export const billingPlanHirePollDelays = [
  0, 1_500, 2_500, 4_000, 7_000, 12_000, 20_000,
] as const;

export function isBillingPlanHireTerminal(hire: BillingPlanHire) {
  return [
    "paid_active",
    "downgrade_scheduled",
    "cancelled",
    "expired",
    "failed",
    "reconciliation_failed",
  ].includes(hire.status);
}

export function trustedBillingPlanHireId(input: {
  callbackHireId: string | null;
  storedHireId: string | null;
}) {
  if (!input.callbackHireId) return input.storedHireId;
  return input.callbackHireId === input.storedHireId
    ? input.storedHireId
    : input.storedHireId;
}
