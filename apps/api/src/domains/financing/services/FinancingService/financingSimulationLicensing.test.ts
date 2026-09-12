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

describe("Credere simulation licensing", () => {
  it("sends canonical IBGE city and UF spelling to Credere", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn<
      FinancingProviderGateway["createSimulation"]
    >(async () => pendingSimulation("credere_inquiry_canonical_location"));

    await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({
        idempotencyKey: "idem_canonical_location",
        vehicle: {
          ...simulationInput().vehicle,
          licensingCity: "  sao   paulo ",
          licensingUf: "sp",
        },
      }),
      createPorts(repository, { createSimulation }),
    );

    expect(createSimulation.mock.calls[0]?.[0]).toMatchObject({
      simulation: {
        vehicle: { licensingCity: "São Paulo", licensingUf: "SP" },
      },
    });
  });

  it("rejects a city and UF mismatch before calling Credere", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const listIntegratedBanks =
      vi.fn<FinancingProviderGateway["listIntegratedBanks"]>();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({
          idempotencyKey: "idem_location_mismatch",
          vehicle: {
            ...simulationInput().vehicle,
            licensingCity: "Campinas",
            licensingUf: "RJ",
          },
        }),
        createPorts(repository, { createSimulation, listIntegratedBanks }),
      ),
    ).rejects.toThrow("Licensing city does not belong to the submitted UF.");
    expect(listIntegratedBanks).not.toHaveBeenCalled();
    expect(createSimulation).not.toHaveBeenCalled();
  });
});
