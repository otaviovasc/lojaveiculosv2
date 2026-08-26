import type { BillingPlanHireRepository } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import {
  approveBillingPlanQuote,
  requestBillingPlanQuote,
} from "./drizzleBillingPlanHireQuotes.js";
import {
  bindPlanHireCheckout,
  bindPlanHireRenewal,
  failBillingPlanHire,
  findBillingPlanHire,
  schedulePlanHireFreeDowngrade,
} from "./drizzleBillingPlanHireLifecycle.js";
import { prepareBillingPlanHire } from "./drizzleBillingPlanHirePreparation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function createDrizzleBillingPlanHireRepository(
  db: DrizzleBillingClient,
): BillingPlanHireRepository {
  return {
    approveQuote: (input) => approveBillingPlanQuote(db, input),
    bindCheckout: (input) => bindPlanHireCheckout(db, input),
    bindRenewal: (input) => bindPlanHireRenewal(db, input),
    failHire: (input) => failBillingPlanHire(db, input),
    findHire: (input) => findBillingPlanHire(db, input),
    prepareHire: (input) => prepareBillingPlanHire(db, input),
    requestQuote: (input) => requestBillingPlanQuote(db, input),
    scheduleFreeDowngrade: (input) => schedulePlanHireFreeDowngrade(db, input),
  };
}
