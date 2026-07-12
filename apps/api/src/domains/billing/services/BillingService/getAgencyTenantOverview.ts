import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { AgencyTenantOverview } from "../../ports/billingRepository.js";
import {
  requireTenantBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export async function getAgencyTenantOverview(
  context: ServiceContext,
  ports: BillingServicePorts,
): Promise<AgencyTenantOverview> {
  assertPermission(context, "billing.manage");
  const scope = requireTenantBillingScope(context);

  context.logger.info(
    "agency.tenant_overview.read.started",
    createServiceLogMetadata(context),
  );

  const overview = await ports.billingRepository.getTenantOverview({
    currentActorCanManage: context.permissions.includes("billing.manage"),
    tenantId: scope.tenantId,
  });

  await context.audit.record({
    action: "agency.tenant_overview.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.tenantId,
    entityType: "agency_tenant",
    metadata: {
      chargeTotalCents: overview.chargePreview.totalCents,
      storeCount: overview.stores.length,
      subscriptionStatus: overview.subscription?.status ?? null,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: null,
    tenantId: scope.tenantId,
    summary: "Read agency tenant overview",
  });

  await context.audit.record({
    action: "agency.tenant_billing.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.tenantId,
    entityType: "billing_account",
    metadata: {
      lineItemCount: overview.chargePreview.lineItems.length,
      monthlyRecurringCents: overview.financialSummary.monthlyRecurringCents,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: null,
    tenantId: scope.tenantId,
    summary: "Read agency tenant billing overview",
  });

  return overview;
}
