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
        updatedAt: now,
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
    listCostsByUnitIds: async ({ unitIds }) =>
      costs.filter((cost) => unitIds.includes(cost.unitId)),
    listPriceHistoryByListing: async ({ listingId }) =>
      prices.filter((item) => item.listingId === listingId),
    listStatusHistoryByListing: async ({ listingId }) =>
      statuses.filter((item) => item.listingId === listingId),
  };
}
