import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingOverview } from "../../ports/billingRepository.js";
import {
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export async function getBillingOverview(
  context: ServiceContext,
  ports: BillingServicePorts,
): Promise<BillingOverview> {
  assertPermission(context, "billing.manage");
  const scope = requireBillingScope(context);

  context.logger.info(
    "billing.overview.read.started",
    createServiceLogMetadata(context),
  );

  const overview = await ports.billingRepository.getOverview({
    billingManagedBy: context.billingManagedBy ?? "store_owner",
    currentActorCanManage: context.permissions.includes("billing.manage"),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "billing.overview.read",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "billing_account",
    metadata: {
      entitlementCount: overview.entitlements.length,
      subscriptionStatus: overview.subscription?.status ?? null,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Read billing and entitlement overview",
  });

  return overview;
}
