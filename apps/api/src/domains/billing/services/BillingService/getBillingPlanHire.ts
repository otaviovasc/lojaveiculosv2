import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingPlanHireRecord } from "../../ports/billingPlanHireRepository.js";
import {
  getBillingPlanHireRepository,
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";
import { BillingPlanHireError } from "./createBillingPlanHire.js";

export async function getBillingPlanHire(
  context: ServiceContext,
  hireId: string,
  ports: BillingServicePorts,
): Promise<BillingPlanHireRecord> {
  assertPermission(context, "billing.manage");
  const hire = await getBillingPlanHireRepository(ports).findHire({
    hireId,
    ...requireBillingScope(context),
  });
  if (!hire) {
    throw new BillingPlanHireError(
      "BILLING_PLAN_HIRE_NOT_FOUND",
      "Plan hire was not found for this store.",
    );
  }
  context.logger.info(
    "billing.plan_hire.read",
    createServiceLogMetadata(context, { hireId: hire.id, status: hire.status }),
  );
  await context.audit.record({
    action: "billing.plan_hire.read",
    actor: context.actor,
    category: "data_access",
    criticality: "low",
    entityId: hire.id,
    entityType: "billing_plan_hire",
    metadata: { status: hire.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: hire.storeId,
    summary: "Read billing plan activation state",
    tenantId: hire.tenantId,
  });
  return hire;
}
