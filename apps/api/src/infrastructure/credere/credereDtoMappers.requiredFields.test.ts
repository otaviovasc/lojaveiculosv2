import { describe, expect, it } from "vitest";
import { mapRequiredFields } from "./credereDtoMappers.js";

describe("Credere required fields mapper", () => {
  it("preserves numeric and nested provider bank identifiers", () => {
    expect(
      mapRequiredFields({
        data: {
          lead: { cpf_cnpj: "52998224725", id: "lead_1" },
          requirements: { email: [655], lead: { has_cnh: ["BV"] } },
        },
      }),
    ).toMatchObject({
      lead: { id: "lead_1" },
      requirements: { email: ["655"], "lead.has_cnh": ["BV"] },
    });
  });
});
