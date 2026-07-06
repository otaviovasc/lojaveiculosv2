import { vi } from "vitest";
import type {
  CreateVehicleMediaRecord,
  ListVehicleChildrenInput,
  ListVehicleUnitChildrenInput,
  VehicleMedia,
  VehicleMediaRepository,
  VehicleUnit,
} from "./ports/vehicleInventoryRepository.js";
import { testNow } from "./testSupportVehicleServiceFixtures.js";
import { isScopedMediaForListings } from "./testSupportVehicleInventoryPredicates.js";

export function createTestVehicleMediaRepository(
  media: Map<string, VehicleMedia>,
  units: Map<string, VehicleUnit>,
  nextSequence: () => number,
): VehicleMediaRepository {
  return {
    create: vi.fn(async (record: CreateVehicleMediaRecord) => {
      const item: VehicleMedia = {
        ...record,
        createdAt: testNow,
        id: `media_${nextSequence()}`,
        updatedAt: testNow,
      };
      media.set(item.id, item);
      return item;
    }),
    delete: vi.fn(
      async (item: VehicleMedia) => (
        media.delete(item.id),
        { ...item, updatedAt: new Date() }
      ),
    ),
    findById: vi.fn(async ({ mediaId, storeId, tenantId, unitId }) => {
      const item = media.get(mediaId);
      if (!item) return null;
      if (item.unitId !== unitId) return null;
      if (item.storeId !== storeId || item.tenantId !== tenantId) return null;
      return item;
    }),
    listByListingIds: vi.fn(async (input: ListVehicleChildrenInput) =>
      [...media.values()].filter((item) =>
        isScopedMediaForListings(item, units, input),
      ),
    ),
    listByUnitIds: vi.fn(
      async ({ storeId, tenantId, unitIds }: ListVehicleUnitChildrenInput) => {
        return [...media.values()].filter(
          (item) =>
            unitIds.includes(item.unitId) &&
            item.storeId === storeId &&
            item.tenantId === tenantId,
        );
      },
    ),
    save: vi.fn(async (item: VehicleMedia) => {
      const updated = { ...item, updatedAt: new Date() };
      media.set(item.id, updated);
      return updated;
    }),
  };
}
