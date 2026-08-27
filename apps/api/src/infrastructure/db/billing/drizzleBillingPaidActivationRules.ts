import type { billingPlanHires } from "@lojaveiculosv2/db";

export function paidEvidenceCanActivateHire(
  hire: Pick<typeof billingPlanHires.$inferSelect, "quotedCents" | "status">,
  amountCents: number,
) {
  return (
    hire.status !== "downgrade_scheduled" && amountCents === hire.quotedCents
  );
}

export function activationIsDue(effectiveAt: Date, observedAt: Date) {
  return effectiveAt <= observedAt;
}

export function addBillingMonth(date: Date): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}
