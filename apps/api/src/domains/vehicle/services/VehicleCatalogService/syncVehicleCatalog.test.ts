import { describe, expect, it, vi } from "vitest";
import type { VehicleCatalogProvider } from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../../ports/vehicleCatalogRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { syncVehicleCatalog } from "./syncVehicleCatalog.js";

describe("syncVehicleCatalog", () => {
  it("fills missing years and skips fresh version-year lookups", async () => {
    const listYears = vi.fn<VehicleCatalogProvider["listYears"]>(async () => [
      {
        code: "2024-1",
        fuelCode: "1",
        modelYear: 2024,
        name: "2024 Gasolina",
      },
    ]);
    const upsertYear = vi.fn<VehicleCatalogRepository["upsertYear"]>(
      async () => undefined,
    );
    const repository = createRepository({
      getVersionYearSyncState: async (input) =>
        input.versionCode === "fresh"
          ? { lastSyncedAt: new Date(), yearCount: 1 }
          : { lastSyncedAt: null, yearCount: 0 },
      upsertYear,
    });

    const result = await syncVehicleCatalog(
      createSyncContext(),
      { refreshAfterDays: 30, vehicleType: "cars" },
      {
        catalogProvider: createProvider({ listYears }),
        catalogRepository: repository,
      },
    );

    expect(result).toMatchObject({
      freshYearLookupsSkipped: 1,
      isComplete: true,
      skippedModelLookups: 0,
      skippedYearLookups: 0,
      yearsSeen: 1,
    });
    expect(listYears).toHaveBeenCalledTimes(1);
    expect(listYears.mock.calls[0]?.[0]).toMatchObject({
      modelCode: "missing",
    });
    expect(upsertYear).toHaveBeenCalledTimes(1);
  });

  it("continues past model lookup failures and marks the run incomplete", async () => {
    const result = await syncVehicleCatalog(
      createSyncContext(),
      { vehicleType: "cars" },
      {
        catalogProvider: createProvider({
          listModels: async () => {
            throw new Error("rate limited");
          },
        }),
        catalogRepository: createRepository(),
      },
    );

    expect(result).toMatchObject({
      isComplete: false,
      skippedModelLookups: 1,
      skippedYearLookups: 0,
      versionsSeen: 0,
    });
  });
});

function createSyncContext() {
  return createServiceContext({
    actor: { id: "vehicle_catalog_sync", kind: "system" },
    permissions: ["inventory.catalog_sync"],
    request: { requestId: "catalog_sync_test" },
  });
}

function createProvider(
  overrides: Partial<VehicleCatalogProvider> = {},
): VehicleCatalogProvider {
  return {
    getVehicle: async () => {
      throw new Error("not used");
    },
    listBrands: async () => [{ code: "21", name: "Fiat" }],
    listModels: async () => [
      { code: "fresh", name: "Toro Volcano" },
      { code: "missing", name: "Pulse Audace" },
    ],
    listYears: async () => [],
    ...overrides,
  };
}

function createRepository(
  overrides: Partial<VehicleCatalogRepository> = {},
): VehicleCatalogRepository {
  return {
    createSyncRun: async (input) => ({
      id: `sync_${input.vehicleType}`,
      vehicleType: input.vehicleType,
    }),
    finishSyncRun: async () => undefined,
    getSnapshot: async () => null,
    getVersionYearSyncState: async () => ({
      lastSyncedAt: null,
      yearCount: 0,
    }),
    listBrands: async () => [],
    listModelFamilies: async () => [],
    listVersions: async () => [],
    listYears: async () => [],
    upsertBrand: async (input) => ({ id: input.code }),
    upsertModelFamily: async (input) => ({
      code: input.name.toLowerCase(),
      id: input.name.toLowerCase(),
      name: input.name,
    }),
    upsertSnapshotDetails: async () => undefined,
    upsertVersion: async (input) => ({ id: input.code }),
    upsertYear: async () => undefined,
    ...overrides,
  };
}
