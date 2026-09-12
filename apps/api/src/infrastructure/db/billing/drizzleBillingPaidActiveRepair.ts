import type { billingPlanHires } from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { recordObservedPaidActivationAudit } from "./drizzleBillingPaidActivationAudit.js";
import { bindPaidActiveProviderIdentity } from "./drizzleBillingPaidActivationIdentity.js";
import { bindPaidPlanProviderCustomer } from "./drizzleBillingPaidPlanIdentity.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function repairPaidActiveProviderIdentity(
  db: DrizzleBillingClient,
  input: {
    hire: typeof billingPlanHires.$inferSelect;
    observation: UpsertBillingProviderPaymentInput;
    observedAt: Date;
    paymentId: string;
  },
) {
  const { hire, observation, observedAt, paymentId } = input;
  const customerBound = await bindPaidPlanProviderCustomer(
    db,
    hire.subscriptionId,
    hire.storeId,
    hire.tenantId,
    observation,
    observedAt,
  );
  if (!customerBound) return false;
  if (!(await bindPaidActiveProviderIdentity(db, hire, observation))) {
    return false;
  }
  await recordObservedPaidActivationAudit(db, {
    hire,
    observation,
    occurredAt: observedAt,
    paymentId,
  });
  return true;
}
