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
        addressZipCode: "01310930",
        birthdate: "1990-05-20",
        cpfCnpj: "12345678901",
        email: "ana@example.com",
        genderCode: "F",
        hasCnh: true,
        id: "lead_1",
        monthlyIncomeCents: 650_000,
        name: "Ana Cliente",
        occupationCode: "43",
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
        addressZipCode: "01310930",
        birthDate: "1990-05-20",
        email: "ana@example.com",
        genderCode: "F",
        hasCnh: true,
        monthlyIncomeCents: 650_000,
        name: "Ana Cliente",
        occupationCode: "43",
        phone: "11999999999",
      },
      domains: {},
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

  it("loads coded domains only when a selected usable bank requires them", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const listDomainOptions = vi.fn(async () => ({
      gender: [{ label: "Feminino", value: "F" }],
      occupation: [{ label: "Servidor público", value: "43" }],
    }));

    const result = await getCredereRequiredFields(
      createStoreContext(["financing.simulation.read"]),
      { bankCodes: ["655"], document: "123.456.789-01" },
      createPorts(repository, {
        getRequiredFields: async () => ({
          lead: null,
          requirements: {
            retrieve_gender: ["655"],
            retrieve_occupation: ["655"],
          },
        }),
        listDomainOptions,
      }),
    );

    expect(listDomainOptions).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["gender", "occupation"] }),
    );
    expect(result.domains).toEqual({
      gender: [{ label: "Feminino", value: "F" }],
      occupation: [{ label: "Servidor público", value: "43" }],
    });
  });
});
