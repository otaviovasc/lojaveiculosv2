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
      referencesSeen: 1,
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
      referencesSeen: 1,
      skippedModelLookups: 1,
      skippedYearLookups: 0,
      versionsSeen: 0,
    });
  });

  it("stores normalized model families and version names", async () => {
    const upsertModelFamily = vi.fn<
      VehicleCatalogRepository["upsertModelFamily"]
    >(async (input) => ({
      code: input.name.toLowerCase(),
      id: input.name.toLowerCase(),
      name: input.name,
    }));
    const upsertVersion = vi.fn<VehicleCatalogRepository["upsertVersion"]>(
      async (input) => ({ id: input.code }),
    );

    await syncVehicleCatalog(
      createSyncContext(),
      { refreshExistingYears: true, vehicleType: "cars" },
      {
        catalogProvider: createProvider({
          listModels: async () => [
            { code: "x3-30", name: "X3 XDRIVE 30 M Sport 2.0 TB Aut." },
          ],
        }),
        catalogRepository: createRepository({
          upsertModelFamily,
          upsertVersion,
        }),
      },
    );

    expect(upsertModelFamily).toHaveBeenCalledWith(
      expect.objectContaining({ name: "X3" }),
    );
    expect(upsertVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "XDRIVE 30 M Sport 2.0 TB Aut.",
        providerName: "X3 XDRIVE 30 M Sport 2.0 TB Aut.",
      }),
    );
  });

  it("can refresh brands and versions without year lookups", async () => {
    const listYears = vi.fn<VehicleCatalogProvider["listYears"]>(async () => [
      { code: "2024-1", fuelCode: "1", modelYear: 2024, name: "2024" },
    ]);

    const result = await syncVehicleCatalog(
      createSyncContext(),
      { syncYears: false, vehicleType: "cars" },
      {
        catalogProvider: createProvider({ listYears }),
        catalogRepository: createRepository(),
      },
    );

    expect(result).toMatchObject({
      isComplete: true,
      versionsSeen: 2,
      yearsSeen: 0,
    });
    expect(listYears).not.toHaveBeenCalled();
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
    getVehicleByFipeCode: async () => {
      throw new Error("not used");
    },
    getVehicleHistory: async () => {
      throw new Error("not used");
    },
    listReferences: async () => [{ code: "334", month: "junho/2026" }],
    listBrands: async () => [{ code: "21", name: "Fiat" }],
    listModels: async () => [
      { code: "fresh", name: "Toro Volcano" },
      { code: "missing", name: "Pulse Audace" },
    ],
    listYears: async () => [],
    listYearsByFipeCode: async () => [],
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
    listPriceHistory: async () => [],
    listVersions: async () => [],
    listYears: async () => [],
    upsertBrand: async (input) => ({ id: input.code }),
    upsertModelFamily: async (input) => ({
      code: input.name.toLowerCase(),
      id: input.name.toLowerCase(),
      name: input.name,
    }),
    upsertPriceHistory: async () => undefined,
    upsertReferences: async () => undefined,
    upsertSnapshotDetails: async () => undefined,
    upsertVersion: async (input) => ({ id: input.code }),
    upsertYear: async () => undefined,
    ...overrides,
  };
}
