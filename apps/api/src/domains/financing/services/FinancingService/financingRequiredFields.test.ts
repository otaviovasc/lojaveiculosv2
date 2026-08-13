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
      lead: {
        birthdate: "1990-05-20",
        cpfCnpj: "12345678901",
        email: "ana@example.com",
        hasCnh: true,
        id: "lead_1",
        monthlyIncomeCents: 650_000,
        name: "Ana Cliente",
        phoneNumber: "11999999999",
      },
      requirements: {
        email: ["655"],
        has_cnh: ["BV"],
        profession: ["999"],
        phone_number: [],
      },
    }));

    await expect(
      getCredereRequiredFields(
        createStoreContext(["financing.simulation.read"]),
        { bankCodes: ["655"], document: "123.456.789-01" },
        createPorts(repository, { getRequiredFields }),
      ),
    ).resolves.toEqual({
      applicant: {
        birthDate: "1990-05-20",
        email: "ana@example.com",
        hasCnh: true,
        monthlyIncomeCents: 650_000,
        name: "Ana Cliente",
        phone: "11999999999",
      },
      knownLead: true,
      missingFields: ["email", "has_cnh", "phone_number"],
      requirements: {
        email: ["BV"],
        has_cnh: ["BV"],
        phone_number: [],
      },
    });
    expect(getRequiredFields).toHaveBeenCalledWith(
      expect.objectContaining({
        cpfCnpj: "12345678901",
        credereStoreId: "credere_store_1",
      }),
    );
  });
});
