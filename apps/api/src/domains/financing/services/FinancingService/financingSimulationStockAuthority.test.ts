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

const permission = ["financing.simulation.create"];

describe("Credere simulation stock authority", () => {
  it("uses authoritative unit listing facts for persistence and provider IO", async () => {
    const repository = createMemoryFinancingRepository({
      listings: [
        {
          assetValueCents: 6_000_000,
          fipeCode: "005340-6",
          id: "listing_1",
          manufactureYear: 2022,
          modelYear: 2023,
          storeId: "store_1",
          tenantId: "tenant_1",
          zeroKm: false,
        },
      ],
    });
    repository.seedConnection();
    repository.seedStoreMapping();
    let providerInput:
      Parameters<FinancingProviderGateway["createSimulation"]>[0] | undefined;
    const createSimulation = vi.fn(
      async (
        input: Parameters<FinancingProviderGateway["createSimulation"]>[0],
      ) => {
        providerInput = input;
        return pendingSimulation("credere_stock_authority");
      },
    );
    const submitted = simulationInput();

    const inquiry = await createCredereSimulation(
      createStoreContext(permission),
      {
        ...submitted,
        listingId: null,
        vehicle: {
          ...submitted.vehicle,
          credereVehicleModelId: "model_1",
        },
      },
      createPorts(repository, { createSimulation }),
    );

    expect(inquiry.listingId).toBe("listing_1");
    expect(createSimulation).toHaveBeenCalledOnce();
    expect(providerInput?.simulation.assetValueCents).toBe(6_000_000);
    expect(providerInput?.simulation.vehicle).toMatchObject({
      credereVehicleModelId: "model_1",
      fipeCode: "005340-6",
      manufactureYear: 2022,
      modelYear: 2023,
      zeroKm: false,
    });
  });

  it.each([
    ["price", { assetValueCents: 6_000_001 }],
    ["manufacture year", { manufactureYear: 2021 }],
    ["model year", { modelYear: 2024 }],
    ["zero kilometer state", { zeroKm: true }],
    ["FIPE code", { fipeCode: "000000-0" }],
  ])(
    "rejects divergent client %s before persistence or provider IO",
    async (_field, vehicleOverride) => {
      const repository = createMemoryFinancingRepository({
        listings: [
          {
            assetValueCents: 6_000_000,
            fipeCode: "005340-6",
            id: "listing_1",
            manufactureYear: 2022,
            modelYear: 2023,
            storeId: "store_1",
            tenantId: "tenant_1",
            zeroKm: false,
          },
        ],
      });
      repository.seedConnection();
      repository.seedStoreMapping();
      const outbound = vi.fn();
      const submitted = simulationInput();

      await expect(
        createCredereSimulation(
          createStoreContext(permission),
          {
            ...submitted,
            vehicle: { ...submitted.vehicle, ...vehicleOverride },
          },
          createPorts(repository, {
            createLead: async () => {
              outbound();
              throw new Error("unexpected provider IO");
            },
          }),
        ),
      ).rejects.toMatchObject({
        message: "Vehicle data does not match the inventory listing.",
        name: "FinancingValidationError",
      });
      expect(repository.inspect().inquiries).toHaveLength(0);
      expect(repository.inspect().operations).toHaveLength(0);
      expect(outbound).not.toHaveBeenCalled();
    },
  );

  it("rejects an incomplete listing instead of trusting client vehicle facts", async () => {
    const repository = createMemoryFinancingRepository({
      listings: [{ id: "listing_1", storeId: "store_1", tenantId: "tenant_1" }],
    });
    repository.seedConnection();
    repository.seedStoreMapping();

    await expect(
      createCredereSimulation(
        createStoreContext(permission),
        simulationInput(),
        createPorts(repository),
      ),
    ).rejects.toMatchObject({
      message: "Listing does not have complete financing data.",
      name: "FinancingValidationError",
    });
    expect(repository.inspect().operations).toHaveLength(0);
  });
});
