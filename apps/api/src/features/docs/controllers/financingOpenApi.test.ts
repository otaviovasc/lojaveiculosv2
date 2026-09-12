import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createSimulationSchema,
  requiredFieldsSchema,
} from "../../financing/controllers/credereFinancing.schemas.js";
import { validSimulationBody } from "../../financing/controllers/credereFinancing.controller.testSupport.js";
import { financingPaths, financingSchemas } from "./financingOpenApi.js";

describe("Credere financing OpenAPI contracts", () => {
  it("keeps required-fields request fields aligned with the runtime validator", () => {
    const documented = z.fromJSONSchema(
      financingSchemas.CredereRequiredFieldsRequest,
    );
    const valid = {
      bankCodes: ["655", "M22"],
      document: "529.982.247-25",
    };
    const invalid = { ...valid, bankCodes: ["invalid bank"] };

    expect(documented.safeParse(valid).success).toBe(true);
    expect(requiredFieldsSchema.safeParse(valid).success).toBe(true);
    expect(documented.safeParse(invalid).success).toBe(false);
    expect(requiredFieldsSchema.safeParse(invalid).success).toBe(false);
  });

  it("documents the real closed simulation body and idempotency header", () => {
    const documented = z.fromJSONSchema(
      financingSchemas.CredereSimulationRequest,
    );
    const valid = validSimulationBody();
    const invalid = {
      ...valid,
      applicant: { ...valid.applicant, providerStoreId: "forbidden" },
    };

    expect(documented.safeParse(valid).success).toBe(true);
    expect(createSimulationSchema.safeParse(valid).success).toBe(true);
    expect(documented.safeParse(invalid).success).toBe(false);
    expect(createSimulationSchema.safeParse(invalid).success).toBe(false);
    expect(
      financingPaths["/api/v1/financing/credere/simulations"].post.parameters,
    ).toEqual([
      expect.objectContaining({
        in: "header",
        name: "Idempotency-Key",
        required: true,
        schema: { type: "string", minLength: 1, maxLength: 191 },
      }),
    ]);
  });

  it("publishes the required-fields response schema used by the store route", () => {
    const documented = z.fromJSONSchema(
      financingSchemas.CredereRequiredFieldsResponse as unknown as Parameters<
        typeof z.fromJSONSchema
      >[0],
    );
    const response = {
      applicant: {
        addressZipCode: "01310100",
        birthDate: "1990-01-01",
        email: "buyer@example.com",
        genderCode: "F",
        hasCnh: true,
        monthlyIncomeCents: 600_000,
        name: "Ana Souza",
        occupationCode: "43",
        phone: "11987654321",
      },
      domains: {
        occupation: [{ label: "Servidor público", value: "43" }],
      },
      knownLead: true,
      missingFields: ["retrieve_occupation"],
      requirements: { retrieve_occupation: ["BV"] },
    };

    expect(documented.safeParse(response).success).toBe(true);
    expect(
      financingPaths["/api/v1/financing/credere/required-fields"].post
        .responses["200"],
    ).toMatchObject({
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/CredereRequiredFieldsResponse",
          },
        },
      },
    });
  });
});
