import { describe, expect, it, vi } from "vitest";
import type { FinancingProviderGateway } from "../../ports/financingProviderGateway.js";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { createCredereSimulation } from "./simulationCreateService.js";
import {
  resolveCredereFipeVehicle,
  type ResolveCredereFipeInput,
} from "./fipeResolutionService.js";
import {
  createPorts,
  createStoreContext,
  simulationInput,
} from "./testSupport.js";

describe("Credere exact FIPE resolution", () => {
  it("queries the scoped provider with an exact FIPE code and model year", async () => {
    const repository = readyRepository();
    const listVehicleModelsByFipe = vi.fn<
      FinancingProviderGateway["listVehicleModelsByFipe"]
    >(async () => [candidate()]);

    const result = await resolveCredereFipeVehicle(
      createStoreContext(["financing.simulation.create"]),
      input(),
      createPorts(repository, { listVehicleModelsByFipe }),
    );

    expect(result).toMatchObject({
      candidate: {
        fipeCode: "005340-6",
        fuelType: "Flex",
        modelId: "model_1",
        molicarCode: "01906108-0",
        version: "1.0 MPI",
        yearEnd: 2025,
        yearStart: 2020,
      },
      status: "resolved",
    });
    expect(listVehicleModelsByFipe).toHaveBeenCalledWith(
      expect.objectContaining({
        credereStoreId: "credere_store_1",
        fipeCode: "005340-6",
        modelYear: 2023,
      }),
    );
  });

  it("filters unavailable or incompatible rows and returns unique ambiguous choices", async () => {
    const repository = readyRepository();
    const result = await resolveCredereFipeVehicle(
      createStoreContext(["financing.simulation.create"]),
      input(),
      createPorts(repository, {
        listVehicleModelsByFipe: async () => [
          candidate(),
          candidate({ id: "duplicate", version: "Duplicate" }),
          candidate({ id: "model_2", molicarCode: "01906109-2" }),
          candidate({ available: false, id: "unavailable" }),
          candidate({ id: "wrong-fipe", fipeCode: "000001-9" }),
          candidate({ id: "wrong-year", yearStart: 2024 }),
        ],
      }),
    );

    expect(result).toMatchObject({ status: "ambiguous" });
    if (result.status !== "ambiguous") throw new Error("Expected ambiguity");
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((entry) => entry.modelId)).toEqual([
      "model_1",
      "model_2",
    ]);
  });

  it("returns mismatch when a selected provider model is stale", async () => {
    const result = await resolveCredereFipeVehicle(
      createStoreContext(["financing.simulation.create"]),
      input({
        selectedModelId: "stale_model",
        selectedMolicarCode: "01906108-0",
      }),
      createPorts(readyRepository()),
    );

    expect(result).toMatchObject({ status: "mismatch" });
  });

  it("revalidates the selected FIPE model before a provider simulation write", async () => {
    const createSimulation = vi.fn();
    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({
          vehicle: {
            ...simulationInput().vehicle,
            credereVehicleModelId: "stale_model",
            fipeCode: "005340-6",
          },
        }),
        createPorts(readyRepository(), { createSimulation }),
      ),
    ).rejects.toThrow("stale or does not match");
    expect(createSimulation).not.toHaveBeenCalled();
  });
});

function readyRepository() {
  const repository = createMemoryFinancingRepository();
  repository.seedConnection();
  repository.seedStoreMapping();
  return repository;
}

function input(overrides: Partial<ResolveCredereFipeInput> = {}) {
  return { fipeCode: "005340-6", modelYear: 2023, ...overrides };
}

function candidate(
  overrides: Partial<
    Awaited<
      ReturnType<FinancingProviderGateway["listVehicleModelsByFipe"]>
    >[number]
  > = {},
) {
  return {
    available: true,
    brand: "VW",
    fipeCode: "005340-6",
    fuelType: "Flex",
    id: "model_1",
    molicarCode: "01906108-0",
    name: "Gol",
    version: "1.0 MPI",
    yearEnd: 2025,
    yearStart: 2020,
    ...overrides,
  };
}
