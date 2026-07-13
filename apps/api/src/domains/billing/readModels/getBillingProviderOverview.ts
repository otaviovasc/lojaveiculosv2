import type { BillingRepository } from "../ports/billingRepository.js";
import type { GetBillingProviderAccountInput } from "../ports/billingProviderRepository.js";

export function getBillingProviderOverview(
  repository: Pick<BillingRepository, "getOverview" | "getTenantOverview">,
  input: GetBillingProviderAccountInput,
) {
  if (input.storeId) {
    return repository.getOverview({
      ...(input.billingManagedBy
        ? { billingManagedBy: input.billingManagedBy }
        : {}),
      ...(typeof input.currentActorCanManage === "boolean"
        ? { currentActorCanManage: input.currentActorCanManage }
        : {}),
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
  }
  return repository.getTenantOverview({
    ...(typeof input.currentActorCanManage === "boolean"
      ? { currentActorCanManage: input.currentActorCanManage }
      : {}),
    tenantId: input.tenantId,
  });
}
