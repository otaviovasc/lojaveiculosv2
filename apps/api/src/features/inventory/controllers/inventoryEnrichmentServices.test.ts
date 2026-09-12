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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      plate: "LKW8015",
      source: "apibrasil",
      vehicle: { brand: "VW", model: "Gol" },
    });
  });

  it("stores and reuses fresh plate lookup results", async () => {
    const lookup = createPlateLookupResponse();
    const repository = createLookupRepository();
    const quotaGuard = createDurableQuotaGuard();
    const plateProvider = {
      lookupPlate: vi.fn(async () => lookup),
    };
    const services = createInventoryEnrichmentServices({
      plateLookupRepository: repository,
      plateProvider,
      quotaGuard,
    });

    await expect(
      services.lookupPlate(createContext(), { plate: "abc1d23" }),
    ).resolves.toMatchObject({ plate: "ABC1D23" });
    await expect(
      services.lookupPlate(createContext(), { plate: "abc1d23" }),
    ).resolves.toMatchObject({ plate: "ABC1D23" });

    expect(plateProvider.lookupPlate).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledTimes(1);
    expect(quotaGuard.reserveUsage).toHaveBeenCalledTimes(1);
    expect(quotaGuard.markUsageStarted).toHaveBeenCalledTimes(1);
    expect(quotaGuard.finalizeUsage).toHaveBeenCalledTimes(1);
    expect(quotaGuard.finalizeUsage).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "succeeded" }),
    );
  });

  it("counts a provider failure and preserves the original provider error", async () => {
    const quotaGuard = createDurableQuotaGuard();
    const providerError = new Error("provider unavailable");
    const plateProvider = {
      lookupPlate: vi.fn().mockRejectedValue(providerError),
    };
    const services = createInventoryEnrichmentServices({
      plateProvider,
      quotaGuard,
    });

    await expect(
      services.lookupPlate(createContext(), { plate: "ABC1D23" }),
    ).rejects.toBe(providerError);

    expect(quotaGuard.finalizeUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCode: "Error",
        outcome: "provider_failed",
      }),
    );
  });

  it("releases a reservation when provider I/O cannot be marked as started", async () => {
    const quotaGuard = createDurableQuotaGuard();
    quotaGuard.markUsageStarted.mockRejectedValue(new Error("database failed"));
    const plateProvider = {
      lookupPlate: vi.fn(async () => createPlateLookupResponse()),
    };
    const services = createInventoryEnrichmentServices({
      plateProvider,
      quotaGuard,
    });

    await expect(
      services.lookupPlate(createContext(), { plate: "ABC1D23" }),
    ).rejects.toThrow("database failed");

    expect(plateProvider.lookupPlate).not.toHaveBeenCalled();
    expect(quotaGuard.finalizeUsage).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "released" }),
    );
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

function createDurableQuotaGuard() {
  return {
    assertAvailable: vi.fn(),
    finalizeUsage: vi.fn().mockResolvedValue(undefined),
    markUsageStarted: vi.fn().mockResolvedValue(undefined),
    reserveUsage: vi
      .fn()
      .mockResolvedValue({ reservationId: "quota_reservation_1" }),
  };
}

function createPlateLookupResponse() {
  return {
    catalogIdentity: {
      candidates: [],
      catalog: null,
      reason: "fipe_not_found" as const,
      status: "unresolved" as const,
    },
    fipe: null,
    fipeCandidates: [],
    lookupVersion: 2 as const,
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
      doors: null,
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
}
