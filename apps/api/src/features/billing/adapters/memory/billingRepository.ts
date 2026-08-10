import type {
  BillingEntitlementEvent,
  BillingOverview,
  BillingRepository,
} from "../../../../domains/billing/ports/billingRepository.js";
import { memoryTrialEntitlements } from "./billingMemoryCatalog.js";
import {
  toMemoryBillingOverview,
  toMemoryTenantOverview,
} from "./billingRepositoryOverview.js";

export function createMemoryBillingRepository(
  options: { storeId?: string; tenantId?: string } = {},
): BillingRepository {
  let entitlements = [...memoryTrialEntitlements];
  let entitlementEvents: BillingEntitlementEvent[] = [];
  let addonContracts: BillingOverview["addonContracts"] = [];
  const managedStoreId = options.storeId ?? "store_1";
  const managedTenantId = options.tenantId;

  return {
    async activateSubscriptionSelection() {},
    async cancelZapiAddon(input) {
      const contract = addonContracts.find(
        (item) => item.storeId === input.storeId && item.status !== "cancelled",
      );
      if (!contract) throw new Error("Z-API contract was not found.");
      const paid =
        contract.status === "active" ||
        contract.status === "paid_awaiting_setup";
      const cancelled = paid
        ? { ...contract, cancellationScheduledFor: input.effectiveAt }
        : { ...contract, status: "cancelled" as const };
      addonContracts = [
        cancelled,
        ...addonContracts.filter((item) => item.id !== contract.id),
      ];
      return cancelled;
    },
    async confirmZapiAddonCancellationSync(input) {
      const contract = addonContracts.find(
        (item) => item.storeId === input.storeId && item.status !== "cancelled",
      );
      if (!contract) throw new Error("Z-API contract was not found.");
      const paid =
        contract.status === "active" ||
        contract.status === "paid_awaiting_setup";
      const confirmed = paid
        ? contract
        : { ...contract, status: "cancelled" as const };
      addonContracts = [
        confirmed,
        ...addonContracts.filter((item) => item.id !== contract.id),
      ];
      return confirmed;
    },
    async completeZapiAddonSetup(input) {
      const contract = addonContracts.find(
        (item) => item.storeId === input.storeId && item.status !== "cancelled",
      );
      if (!contract) throw new Error("Z-API contract was not found.");
      const active = {
        ...contract,
        setupCompletedAt: new Date(),
        setupConnectionId: input.connectionId,
        status: "active" as const,
      };
      addonContracts = [
        active,
        ...addonContracts.filter((item) => item.id !== contract.id),
      ];
      return active;
    },
    async getOverview(input) {
      return toMemoryBillingOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        addonContracts,
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
        addonContracts,
        "agency",
        input.currentActorCanManage,
      );
      return { ...toMemoryTenantOverview(overview), addonContracts };
    },
    async markZapiAddonScheduled(input) {
      const contract = addonContracts.find(
        (item) => item.id === input.contractId,
      );
      if (!contract) throw new Error("Z-API contract was not found.");
      const scheduled = { ...contract, status: "scheduled" as const };
      addonContracts = [
        scheduled,
        ...addonContracts.filter((item) => item.id !== contract.id),
      ];
      return scheduled;
    },
    async requestZapiAddon(input) {
      const existing = addonContracts.find(
        (item) => item.storeId === input.storeId && item.status !== "cancelled",
      );
      if (existing) return existing;
      const contract = {
        addonCode: "crm_zapi",
        cancellationScheduledFor: null,
        id: `zapi_contract_${addonContracts.length + 1}`,
        monthlyPriceCents: 10000,
        paidAt: null,
        scheduledFor: input.scheduledFor,
        setupCompletedAt: null,
        setupConnectionId: null,
        status: "pending" as const,
        storeId: input.storeId,
        supportCode: `ZAPI-MEM${String(addonContracts.length + 1).padStart(9, "0")}`,
      };
      addonContracts = [contract, ...addonContracts];
      return contract;
    },
    async storeExistsInTenant(input) {
      return (
        input.storeId === managedStoreId &&
        (managedTenantId === undefined || input.tenantId === managedTenantId)
      );
    },
    async updateSubscriptionSelection(input) {
      return toMemoryBillingOverview(
        input.storeId,
        input.tenantId,
        entitlements,
        entitlementEvents,
        addonContracts,
        input.billingManagedBy,
        input.currentActorCanManage,
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
        addonContracts,
        input.billingManagedBy,
        input.currentActorCanManage,
      );
    },
  };
}
