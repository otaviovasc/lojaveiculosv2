import type {
  BillingEntitlementEvent,
  BillingRepository,
} from "../../../../domains/billing/ports/billingRepository.js";
import { memoryDefaultEntitlements } from "./billingMemoryCatalog.js";
import {
  toMemoryBillingOverview,
  toMemoryTenantOverview,
} from "./billingRepositoryOverview.js";

export function createMemoryBillingRepository(
  options: { storeId?: string; tenantId?: string } = {},
): BillingRepository {
  let entitlements = [...memoryDefaultEntitlements];
  let entitlementEvents: BillingEntitlementEvent[] = [];
  const managedStoreId = options.storeId ?? "store_1";
  const managedTenantId = options.tenantId;

  return {
    async activateSubscriptionSelection() {},
    async getOverview(input) {
      return toMemoryBillingOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        input.billingManagedBy,
        input.currentActorCanManage,
      );
    },
    async getTenantOverview(input) {
      const overview = toMemoryBillingOverview(
        managedStoreId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        "agency",
        input.currentActorCanManage,
      );
      return toMemoryTenantOverview(overview);
    },
    async storeExistsInTenant(input) {
      return (
        input.storeId === managedStoreId &&
        (managedTenantId === undefined || input.tenantId === managedTenantId)
      );
    },
    async updateStoreEntitlement(input) {
      const before = entitlements.find(
        (entitlement) => entitlement.featureKey === input.featureKey,
      );
      entitlements = [
        ...entitlements.filter(
          (entitlement) => entitlement.featureKey !== input.featureKey,
        ),
        {
          endsAt: input.endsAt ?? null,
          featureKey: input.featureKey,
          metadata: input.metadata ?? {},
          source: input.source,
          startsAt: input.startsAt ?? null,
          status: input.status,
        },
      ].sort((left, right) => left.featureKey.localeCompare(right.featureKey));
      entitlementEvents = [
        {
          actorId: input.actorId ?? null,
          createdAt: new Date(),
          featureKey: input.featureKey,
          id: `event_${entitlementEvents.length + 1}`,
          metadata: input.metadata ?? {},
          nextStatus: input.status,
          previousStatus: input.previousStatus ?? before?.status ?? null,
          reason: input.reason ?? null,
          source: input.source,
        },
        ...entitlementEvents,
      ].slice(0, 25);

      return toMemoryBillingOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        input.billingManagedBy,
        input.currentActorCanManage,
      );
    },
  };
}
