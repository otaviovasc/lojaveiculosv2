import { describe, expect, it } from "vitest";
import { mapRequiredFields } from "./credereDtoMappers.js";

describe("Credere required fields mapper", () => {
  it("preserves numeric and nested provider bank identifiers", () => {
    expect(
      mapRequiredFields({
        data: {
          lead: {
            birthdate: "1990-05-10",
            cpf_cnpj: "52998224725",
            email: "ana@example.com",
            has_cnh: true,
            id: "lead_1",
            monthly_income: 500_000,
            name: "Ana Silva",
            phone_number: "11999990000",
          },
          requirements: { email: [655], lead: { has_cnh: ["BV"] } },
        },
      }),
    ).toMatchObject({
      lead: {
        birthdate: "1990-05-10",
        email: "ana@example.com",
        hasCnh: true,
        id: "lead_1",
        monthlyIncomeCents: 500_000,
        name: "Ana Silva",
        phoneNumber: "11999990000",
      },
      requirements: { email: ["655"], "lead.has_cnh": ["BV"] },
    });
  });
});
