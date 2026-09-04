import { BillingPlanHireError } from "./billingPlanHireErrors.js";

export function callbackUrls(
  publicAppUrl: string | undefined,
  returnPath: string,
  hireId: string,
) {
  if (!publicAppUrl) {
    throw new BillingPlanHireError(
      "BILLING_CALLBACK_UNAVAILABLE",
      "Billing callback URL is not configured.",
    );
  }
  const base = new URL(returnPath, publicAppUrl);
  base.searchParams.set("hireId", hireId);
  const withState = (state: string) => {
    const url = new URL(base);
    url.searchParams.set("checkout", state);
    return url.toString();
  };
  return {
    cancelUrl: withState("cancelled"),
    expiredUrl: withState("expired"),
    successUrl: withState("returned"),
  };
}

export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
