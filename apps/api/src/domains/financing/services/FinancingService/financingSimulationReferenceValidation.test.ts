import { describe, expect, it, vi } from "vitest";
import {
  createMemoryFinancingRepository,
  type MemoryFinancingRepositoryOptions,
} from "../../testing/financingRepository.js";
import { createCredereSimulation } from "./simulationCreateService.js";
import {
  createPorts,
  createStoreContext,
  simulationInput,
} from "./testSupport.js";

const permission = ["financing.simulation.create"];

describe("Financing simulation reference validation", () => {
  it("accepts active lead, listing, and unit references in the same scope", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();

    const inquiry = await createCredereSimulation(
      createStoreContext(permission),
      simulationInput({ leadId: "lead_1" }),
      createPorts(repository),
    );

    expect(inquiry).toMatchObject({
      leadId: "lead_1",
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
      unitId: "unit_1",
    });
  });

  it("rejects a lead from another store before persistence or provider IO", async () => {
    await expectInvalidReferences(
      {
        leads: [{ id: "lead_other", storeId: "store_2", tenantId: "tenant_1" }],
      },
      { leadId: "lead_other" },
      "Lead reference is invalid for this store.",
    );
  });

  it("rejects a listing from another tenant before persistence or provider IO", async () => {
    await expectInvalidReferences(
      {
        listings: [
          { id: "listing_other", storeId: "store_1", tenantId: "tenant_2" },
        ],
      },
      { listingId: "listing_other", unitId: null },
      "Listing reference is invalid for this store.",
    );
  });

  it("rejects a unit that belongs to a different listing", async () => {
    await expectInvalidReferences(
      {
        listings: [
          { id: "listing_1", storeId: "store_1", tenantId: "tenant_1" },
          { id: "listing_2", storeId: "store_1", tenantId: "tenant_1" },
        ],
        units: [
          {
            id: "unit_1",
            listingId: "listing_2",
            storeId: "store_1",
            tenantId: "tenant_1",
          },
        ],
      },
      {},
      "Unit reference does not belong to the listing.",
    );
  });

  it("rejects a soft-deleted unit", async () => {
    await expectInvalidReferences(
      {
        units: [
          {
            id: "unit_1",
            isDeleted: true,
            listingId: "listing_1",
            storeId: "store_1",
            tenantId: "tenant_1",
          },
        ],
      },
      {},
      "Unit reference is invalid for this store.",
    );
  });

  it("rechecks references inside createInquiry before inserting", async () => {
    const repository = createMemoryFinancingRepository({
      leads: [{ id: "lead_other", storeId: "store_2", tenantId: "tenant_1" }],
    });
    repository.seedConnection();
    repository.seedStoreMapping();
    vi.spyOn(repository, "validateInquiryReferences").mockResolvedValue({
      valid: true,
    });

    await expect(
      createCredereSimulation(
        createStoreContext(permission),
        simulationInput({ leadId: "lead_other" }),
        createPorts(repository),
      ),
    ).rejects.toMatchObject({
      message: "Lead reference is invalid for this store.",
      name: "FinancingValidationError",
    });
    expect(repository.inspect().inquiries).toHaveLength(0);
  });
});

async function expectInvalidReferences(
  repositoryOptions: MemoryFinancingRepositoryOptions,
  input: Parameters<typeof simulationInput>[0],
  message: string,
) {
  const repository = createMemoryFinancingRepository(repositoryOptions);
  repository.seedConnection();
  repository.seedStoreMapping();
  const createInquiry = vi.spyOn(repository, "createInquiry");
  const outbound = vi.fn();

  await expect(
    createCredereSimulation(
      createStoreContext(permission),
      simulationInput(input),
      createPorts(repository, {
        createLead: async () => {
          outbound();
          throw new Error("unexpected provider IO");
        },
        createSimulation: async () => {
          outbound();
          throw new Error("unexpected provider IO");
        },
        listIntegratedBanks: async () => {
          outbound();
          throw new Error("unexpected provider IO");
        },
        listSellers: async () => {
          outbound();
          throw new Error("unexpected provider IO");
        },
        listVehicleModelsByFipe: async () => {
          outbound();
          throw new Error("unexpected provider IO");
        },
        lookupVehicleModel: async () => {
          outbound();
          throw new Error("unexpected provider IO");
        },
      }),
    ),
  ).rejects.toMatchObject({ message, name: "FinancingValidationError" });
  expect(createInquiry).not.toHaveBeenCalled();
  expect(outbound).not.toHaveBeenCalled();
}
