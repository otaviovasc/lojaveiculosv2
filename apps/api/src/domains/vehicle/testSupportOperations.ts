import type {
  VehicleCost,
  VehicleOperationsRepository,
  VehiclePriceHistoryEntry,
  VehicleStatusHistoryEntry,
} from "./ports/vehicleOperationsRepository.js";

const now = new Date("2026-01-01T00:00:00.000Z");

export type TestVehicleOperationsRepository = VehicleOperationsRepository & {
  costs: VehicleCost[];
  prices: VehiclePriceHistoryEntry[];
  statuses: VehicleStatusHistoryEntry[];
};

export function createTestOperationsRepository(): TestVehicleOperationsRepository {
  const costs: VehicleCost[] = [];
  const prices: VehiclePriceHistoryEntry[] = [];
  const statuses: VehicleStatusHistoryEntry[] = [];
  return {
    costs,
    prices,
    statuses,
    createCost: async (record) => {
      const cost = {
        ...record,
        createdAt: now,
        id: `cost_${costs.length + 1}`,
        status: "active" as const,
        updatedAt: now,
        voidedAt: null,
        voidReason: null,
      };
      costs.push(cost);
      return cost;
    },
    createPriceHistory: async (record) => {
      const item = {
        ...record,
        changedAt: now,
        createdAt: now,
        id: `price_${prices.length + 1}`,
        updatedAt: now,
      };
      prices.push(item);
      return item;
    },
    createStatusHistory: async (record) => {
      const item = {
        ...record,
        changedAt: now,
        createdAt: now,
        id: `status_${statuses.length + 1}`,
        updatedAt: now,
      };
      statuses.push(item);
      return item;
    },
    findCost: async ({ costId, storeId, tenantId, unitId }) =>
      costs.find(
        (cost) =>
          cost.id === costId &&
          cost.storeId === storeId &&
          cost.tenantId === tenantId &&
          cost.unitId === unitId,
      ) ?? null,
    listActiveCostsByUnitIds: async ({ storeId, tenantId, unitIds }) =>
      costs.filter(
        (cost) =>
          unitIds.includes(cost.unitId) &&
          cost.status === "active" &&
          cost.storeId === storeId &&
          cost.tenantId === tenantId,
      ),
    listCostsByUnitIds: async ({ unitIds }) =>
      costs.filter((cost) => unitIds.includes(cost.unitId)),
    listPriceHistoryByListing: async ({ listingId }) =>
      prices.filter((item) => item.listingId === listingId),
    listStatusHistoryByListing: async ({ listingId }) =>
      statuses.filter((item) => item.listingId === listingId),
    updateCost: async (record) => {
      const index = costs.findIndex(
        (cost) =>
          cost.id === record.costId &&
          cost.storeId === record.storeId &&
          cost.tenantId === record.tenantId &&
          cost.unitId === record.unitId &&
          cost.status === record.expectedStatus,
      );
      const current = costs[index];
      if (!current) return null;
      const updated = {
        ...current,
        ...(record.amountCents !== undefined
          ? { amountCents: record.amountCents }
          : {}),
        ...(record.costDate !== undefined ? { costDate: record.costDate } : {}),
        ...(record.description !== undefined
          ? { description: record.description }
          : {}),
        ...(record.kind !== undefined ? { kind: record.kind } : {}),
        ...(record.status !== undefined ? { status: record.status } : {}),
        ...(record.voidedAt !== undefined ? { voidedAt: record.voidedAt } : {}),
        ...(record.voidReason !== undefined
          ? { voidReason: record.voidReason }
          : {}),
        updatedAt: now,
      };
      costs[index] = updated;
      return updated;
    },
  };
}
