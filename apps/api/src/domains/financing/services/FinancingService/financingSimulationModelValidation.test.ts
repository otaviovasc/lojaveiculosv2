import { describe, expect, it, vi } from "vitest";
import type { FinancingProviderGateway } from "../../ports/financingProviderGateway.js";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { createCredereSimulation } from "./simulationCreateService.js";
import {
  createPorts,
  createStoreContext,
  pendingSimulation,
  simulationInput,
} from "./testSupport.js";

describe("Financing simulation model validation", () => {
  it("validates a selected Credere model id against the provider Molicar lookup", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const lookupVehicleModel = vi.fn<
      FinancingProviderGateway["lookupVehicleModel"]
    >(async () => ({
      active: true,
      brand: "VW",
      fipeCode: null,
      id: "model_1",
      molicarCode: "01906108-0",
      name: "Gol",
      version: null,
      yearEnd: null,
      yearStart: null,
    }));
    const createSimulation = vi.fn<
      FinancingProviderGateway["createSimulation"]
    >(async () => pendingSimulation("credere_inquiry_selected_model"));

    await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({
        idempotencyKey: "idem_selected_model",
        vehicle: {
          ...simulationInput().vehicle,
          credereVehicleModelId: "model_1",
        },
      }),
      createPorts(repository, { createSimulation, lookupVehicleModel }),
    );

    expect(lookupVehicleModel).toHaveBeenCalledWith(
      expect.objectContaining({ modelYear: 2023, query: "01906108-0" }),
    );
    expect(createSimulation.mock.calls[0]?.[0]).toMatchObject({
      simulation: {
        vehicle: {
          credereVehicleModelId: "model_1",
          vehicleMolicarCode: "01906108-0",
        },
      },
    });
  });

  it("rejects a selected Credere model id that does not match the provider lookup", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({
          idempotencyKey: "idem_selected_model_mismatch",
          vehicle: {
            ...simulationInput().vehicle,
            credereVehicleModelId: "model_wrong",
          },
        }),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toThrow(
      "Credere vehicle model selection does not match the submitted Molicar code",
    );
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("rejects a selected Credere model id when the provider returns a different Molicar code", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({
          idempotencyKey: "idem_selected_model_molicar_mismatch",
          vehicle: {
            ...simulationInput().vehicle,
            credereVehicleModelId: "model_1",
          },
        }),
        createPorts(repository, {
          createSimulation,
          lookupVehicleModel: async () => ({
            active: true,
            brand: "VW",
            fipeCode: null,
            id: "model_1",
            molicarCode: "99999999-9",
            name: "Gol",
            version: null,
            yearEnd: null,
            yearStart: null,
          }),
        }),
      ),
    ).rejects.toThrow(
      "Credere vehicle model selection does not match the submitted Molicar code",
    );
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it.each([
    { yearEnd: 2022, yearStart: 2018 },
    { yearEnd: 2028, yearStart: 2024 },
  ])(
    "rejects a provider model outside its compatible year interval",
    async ({ yearEnd, yearStart }) => {
      const repository = createMemoryFinancingRepository();
      repository.seedConnection();
      repository.seedStoreMapping();
      const createSimulation = vi.fn();

      await expect(
        createCredereSimulation(
          createStoreContext(["financing.simulation.create"]),
          simulationInput({ idempotencyKey: `idem_year_${yearStart}` }),
          createPorts(repository, {
            createSimulation,
            lookupVehicleModel: async () => ({
              active: true,
              brand: "VW",
              fipeCode: null,
              id: "model_1",
              molicarCode: "01906108-0",
              name: "Gol",
              version: null,
              yearEnd,
              yearStart,
            }),
          }),
        ),
      ).rejects.toThrow(
        "Credere vehicle model is not available for the submitted model year",
      );
      expect(createSimulation).not.toHaveBeenCalled();
    },
  );
});
