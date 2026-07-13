import { afterEach, describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type {
  FindVehiclePlateLookupInput,
  UpsertVehiclePlateLookupInput,
  VehiclePlateLookupRecord,
  VehiclePlateLookupRepository,
} from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";
import { createInventoryEnrichmentServices } from "./inventoryEnrichmentServices.js";

describe("createInventoryEnrichmentServices", () => {
  const originalPlateKey = process.env.API_PLACA_KEY;

  afterEach(() => {
    if (originalPlateKey === undefined) delete process.env.API_PLACA_KEY;
    else process.env.API_PLACA_KEY = originalPlateKey;
    vi.unstubAllGlobals();
  });

  it("does not call the paid plate provider when the lookup quota is exhausted", async () => {
    const plateProvider = {
      lookupPlate: vi.fn(),
    };
    const services = createInventoryEnrichmentServices({
      plateProvider,
      quotaGuard: {
        assertAvailable: vi.fn().mockRejectedValue(new Error("quota exceeded")),
      },
    } as never);

    await expect(
      services.lookupPlate(createContext(), { plate: "ABC1D23" }),
    ).rejects.toThrow("quota exceeded");
    expect(plateProvider.lookupPlate).not.toHaveBeenCalled();
  });

  it("reads the plate provider token lazily after local env has loaded", async () => {
    delete process.env.API_PLACA_KEY;
    const services = createInventoryEnrichmentServices();
    process.env.API_PLACA_KEY = "plate-token";
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer plate-token",
      });
      return new Response(
        JSON.stringify({
          data: {
            dados: {
              ano: "2012",
              anoModelo: "2013",
              cor: "Prata",
              marca: "VW",
              modelo: "Gol",
              placa: "LKW8015",
            },
          },
          error: false,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await services.lookupPlate(createContext(), {
      plate: "lkw8015",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      plate: "LKW8015",
      source: "apibrasil",
      vehicle: { brand: "VW", model: "Gol" },
    });
  });

  it("stores and reuses fresh plate lookup results", async () => {
    const lookup = {
      fipe: null,
      metadata: [],
      plate: "ABC1D23",
      source: "apibrasil" as const,
      vehicle: {
        aspiration: null,
        bodyType: null,
        brand: "Fiat",
        chassis: null,
        city: null,
        color: "Branca",
        engine: null,
        fuel: "Flex",
        manufactureYear: 2023,
        mileageKm: null,
        model: "Strada",
        modelYear: 2023,
        origin: null,
        power: null,
        state: null,
        transmission: null,
        vehicleType: null,
        version: "Ranch",
      },
    };
    const repository = createLookupRepository();
    const plateProvider = {
      lookupPlate: vi.fn(async () => lookup),
    };
    const services = createInventoryEnrichmentServices({
      plateLookupRepository: repository,
      plateProvider,
    });

    await expect(
      services.lookupPlate(createContext(), { plate: "abc1d23" }),
    ).resolves.toMatchObject({ plate: "ABC1D23" });
    await expect(
      services.lookupPlate(createContext(), { plate: "abc1d23" }),
    ).resolves.toMatchObject({ plate: "ABC1D23" });

    expect(plateProvider.lookupPlate).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledTimes(1);
  });
});

function createContext() {
  return {
    ...createServiceContext({
      permissions: ["inventory.read"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["plate_lookup" as const],
  };
}

function createLookupRepository() {
  const records = new Map<string, VehiclePlateLookupRecord>();
  const repository: VehiclePlateLookupRepository = {
    findLatest: vi.fn(async (input: FindVehiclePlateLookupInput) => {
      const record = records.get(input.plate);
      if (!record) return null;
      if (input.minFetchedAt && record.fetchedAt < input.minFetchedAt) {
        return null;
      }
      return record;
    }),
    upsert: vi.fn(async (input: UpsertVehiclePlateLookupInput) => {
      const record = toLookupRecord(input);
      records.set(record.plate, record);
      return record;
    }),
  };
  return repository;
}

function toLookupRecord(
  input: UpsertVehiclePlateLookupInput,
): VehiclePlateLookupRecord {
  return {
    fetchedAt: input.fetchedAt,
    id: "lookup_1",
    plate: input.plate,
    provider: input.provider,
    response: input.response,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
}
