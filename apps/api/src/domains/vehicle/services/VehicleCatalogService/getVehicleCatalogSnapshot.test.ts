import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleCatalogProvider } from "../../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../../ports/vehicleCatalogRepository.js";
import { getVehicleCatalogSnapshot } from "./getVehicleCatalogSnapshot.js";

describe("getVehicleCatalogSnapshot", () => {
  it("returns the DB-enriched family identity after caching a provider miss", async () => {
    const providerSnapshot = catalogSnapshot();
    const persistedSnapshot = {
      ...providerSnapshot,
      modelFamilyCode: "v40",
      modelFamilyName: "V40",
    };
    const getSnapshot = vi
      .fn<VehicleCatalogRepository["getSnapshot"]>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedSnapshot);
    const upsertSnapshotDetails = vi.fn<
      VehicleCatalogRepository["upsertSnapshotDetails"]
    >(async () => undefined);
    const catalogRepository = {
      getSnapshot,
      upsertSnapshotDetails,
    } as unknown as VehicleCatalogRepository;
    const getVehicle = vi.fn<VehicleCatalogProvider["getVehicle"]>(
      async () => providerSnapshot,
    );
    const catalogProvider = { getVehicle } as unknown as VehicleCatalogProvider;

    await expect(
      getVehicleCatalogSnapshot(
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: ["inventory.read"],
          request: { requestId: "request_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
        {
          brandCode: "59",
          modelCode: "2344",
          vehicleType: "cars",
          yearCode: "2013-1",
        },
        { catalogProvider, catalogRepository },
      ),
    ).resolves.toMatchObject({
      modelFamilyCode: "v40",
      modelFamilyName: "V40",
    });
    expect(upsertSnapshotDetails).toHaveBeenCalledWith({
      ...providerSnapshot,
      modelFamilyCode: null,
      modelFamilyName: null,
    });
    expect(getSnapshot).toHaveBeenCalledTimes(2);
  });

  it("keeps requested family identity when the provider cache cannot be reread", async () => {
    const providerSnapshot = catalogSnapshot();
    const catalogRepository = {
      getSnapshot: vi.fn(async () => null),
      upsertSnapshotDetails: vi.fn(async () => undefined),
    } as unknown as VehicleCatalogRepository;
    const catalogProvider = {
      getVehicle: vi.fn(async () => providerSnapshot),
    } as unknown as VehicleCatalogProvider;

    await expect(
      getVehicleCatalogSnapshot(
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: ["inventory.read"],
          request: { requestId: "request_2" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
        {
          brandCode: "59",
          modelCode: "2344",
          modelFamilyCode: "v40",
          modelFamilyName: "V40",
          vehicleType: "cars",
          yearCode: "2013-1",
        },
        { catalogProvider, catalogRepository },
      ),
    ).resolves.toMatchObject({
      modelFamilyCode: "v40",
      modelFamilyName: "V40",
    });
    expect(catalogRepository.upsertSnapshotDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        modelFamilyCode: "v40",
        modelFamilyName: "V40",
      }),
    );
  });
});

function catalogSnapshot() {
  return {
    brandCode: "59",
    brandName: "Volvo",
    fipeCode: "029039-4",
    fuel: "Gasolina",
    modelCode: "2344",
    modelName: "V40 T-4 2.0 Aut./Mec.",
    modelYear: 2013,
    priceCents: 6552600,
    referenceMonth: "agosto de 2026",
    source: "fipe" as const,
    vehicleType: "cars" as const,
    yearCode: "2013-1",
    yearName: "2013 Gasolina",
  };
}
