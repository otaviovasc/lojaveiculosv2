import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingPlanHireRecord } from "../../ports/billingPlanHireRepository.js";

export async function auditBillingPlanHire(
  context: ServiceContext,
  hire: BillingPlanHireRecord,
  action: string,
) {
  await context.audit.record({
    action,
    actor: context.actor,
    category: "data_change",
    criticality: "critical",
    entityId: hire.id,
    entityType: "billing_plan_hire",
    metadata: {
      catalogVersion: hire.catalogVersion,
      planId: hire.planId,
      providerCheckoutId: hire.providerCheckoutId,
      quotedCents: hire.quotedCents,
      status: hire.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: hire.storeId,
    summary: "Created billing plan checkout",
    tenantId: hire.tenantId,
  });
}
