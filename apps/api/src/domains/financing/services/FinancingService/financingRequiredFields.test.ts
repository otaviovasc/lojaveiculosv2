import { describe, expect, it, vi } from "vitest";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { getCredereRequiredFields } from "./requiredFieldsService.js";
import { createPorts, createStoreContext } from "./testSupport.js";

describe("Credere required fields", () => {
  it("returns sanitized required fields through the mapped store", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const getRequiredFields = vi.fn(async () => ({
      lead: { cpfCnpj: "12345678901", id: "lead_1", name: "Ana Cliente" },
      requirements: { lead: ["email"], vehicle: ["licensing_city"] },
    }));

    await expect(
      getCredereRequiredFields(
        createStoreContext(["financing.simulation.read"]),
        { document: "123.456.789-01" },
        createPorts(repository, { getRequiredFields }),
      ),
    ).resolves.toEqual({
      knownLead: true,
      missingFields: ["email", "licensing_city"],
      requirements: { lead: ["email"], vehicle: ["licensing_city"] },
    });
    expect(getRequiredFields).toHaveBeenCalledWith(
      expect.objectContaining({
        cpfCnpj: "12345678901",
        credereStoreId: "credere_store_1",
      }),
    );
  });
});
