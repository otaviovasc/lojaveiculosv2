import type { BillingPlanHireRepository } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import {
  approveBillingPlanQuote,
  requestBillingPlanQuote,
} from "./drizzleBillingPlanHireQuotes.js";
import {
  beginPlanHireCheckoutRequest,
  bindPlanHireCheckout,
  bindPlanHireRenewal,
  failBillingPlanHire,
  findBillingPlanHire,
  restorePlanHireFreeDowngradeCancellation,
  schedulePlanHireFreeDowngrade,
  supersedePlanHireFreeDowngrade,
} from "./drizzleBillingPlanHireLifecycle.js";
import { prepareBillingPlanHire } from "./drizzleBillingPlanHirePreparation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function createDrizzleBillingPlanHireRepository(
  db: DrizzleBillingClient,
): BillingPlanHireRepository {
  return {
    approveQuote: (input) => approveBillingPlanQuote(db, input),
    beginCheckoutRequest: (input) => beginPlanHireCheckoutRequest(db, input),
    bindCheckout: (input) => bindPlanHireCheckout(db, input),
    bindRenewal: (input) => bindPlanHireRenewal(db, input),
    failHire: (input) => failBillingPlanHire(db, input),
    findHire: (input) => findBillingPlanHire(db, input),
    prepareHire: (input) => prepareBillingPlanHire(db, input),
    requestQuote: (input) => requestBillingPlanQuote(db, input),
    restoreFreeDowngradeCancellation: (input) =>
      restorePlanHireFreeDowngradeCancellation(db, input),
    scheduleFreeDowngrade: (input) => schedulePlanHireFreeDowngrade(db, input),
    supersedeFreeDowngrade: (input) =>
      supersedePlanHireFreeDowngrade(db, input),
  };
}
