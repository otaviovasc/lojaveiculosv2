import type {
  VehicleCost,
  VehicleOperationsRepository,
  VehiclePriceHistoryEntry,
  VehicleStatusHistoryEntry,
} from "../../../../domains/vehicle/ports/vehicleOperationsRepository.js";

export function createMemoryVehicleOperationsRepository(): VehicleOperationsRepository {
  const costs = new Map<string, VehicleCost>();
  const priceHistory = new Map<string, VehiclePriceHistoryEntry>();
  const statusHistory = new Map<string, VehicleStatusHistoryEntry>();
  let costSequence = 1;
  let priceHistorySequence = 1;
  let statusHistorySequence = 1;

  return {
    createCost: async (record) => {
      const item = createCostRecord(record, costSequence);
      costSequence += 1;
      costs.set(item.id, item);
      return item;
    },
    createPriceHistory: async (record) => {
      const item = createPriceHistoryRecord(record, priceHistorySequence);
      priceHistorySequence += 1;
      priceHistory.set(item.id, item);
      return item;
    },
    createStatusHistory: async (record) => {
      const item = createStatusHistoryRecord(record, statusHistorySequence);
      statusHistorySequence += 1;
      statusHistory.set(item.id, item);
      return item;
    },
    listCostsByUnitIds: async ({ storeId, tenantId, unitIds }) =>
      [...costs.values()].filter(
        (cost) =>
          unitIds.includes(cost.unitId) &&
          cost.storeId === storeId &&
          cost.tenantId === tenantId,
      ),
    listPriceHistoryByListing: async ({ listingId, storeId, tenantId }) =>
      [...priceHistory.values()].filter(
        (item) =>
          item.listingId === listingId &&
          item.storeId === storeId &&
          item.tenantId === tenantId,
      ),
    listStatusHistoryByListing: async ({ listingId, storeId, tenantId }) =>
      [...statusHistory.values()].filter(
        (item) =>
          item.listingId === listingId &&
          item.storeId === storeId &&
          item.tenantId === tenantId,
      ),
  };
}

function createCostRecord(
  record: Parameters<VehicleOperationsRepository["createCost"]>[0],
  sequence: number,
): VehicleCost {
  const now = new Date();
  return { ...record, createdAt: now, id: `cost_${sequence}`, updatedAt: now };
}

function createPriceHistoryRecord(
  record: Parameters<VehicleOperationsRepository["createPriceHistory"]>[0],
  sequence: number,
): VehiclePriceHistoryEntry {
  const now = new Date();
  return {
    ...record,
    changedAt: now,
    createdAt: now,
    id: `price_history_${sequence}`,
    updatedAt: now,
  };
}

function createStatusHistoryRecord(
  record: Parameters<VehicleOperationsRepository["createStatusHistory"]>[0],
  sequence: number,
): VehicleStatusHistoryEntry {
  const now = new Date();
  return {
    ...record,
    changedAt: now,
    createdAt: now,
    id: `status_history_${sequence}`,
    updatedAt: now,
  };
}
