import { describe, expect, it } from "vitest";
import {
  buildCreateSimulationBody,
  createIdempotencyKey,
  FORBIDDEN_SCOPE_KEYS,
} from "./requestBuilder";
import type { CredereSimulationDraft } from "./types";

const consent = {
  acceptedTerms: true,
  acceptedAt: "2026-07-27T12:00:00.000Z",
  channel: "store_workspace",
  policyVersion: "v1",
};

const draft: CredereSimulationDraft = {
  applicant: {
    birthDate: "1990-05-10",
    cpfCnpj: "123.456.789-09",
    email: "ana@example.com",
    monthlyIncomeCents: 850_000,
    name: "Ana Souza",
    phone: "+55 (11) 98765-4321",
  },
  consent,
  downPaymentCents: 3_000_000,
  installments: 48,
  leadId: "lead_1",
  listingId: "listing_1",
  requestedBankCodes: ["001", "237"],
  unitId: "unit_1",
  vehicle: {
    priceCents: 10_000_000,
    licensingCity: "São Paulo",
    licensingUf: "SP",
    manufactureYear: 2025,
    modelYear: 2026,
    molicarCode: "MOL123",
    zeroKm: false,
  },
};

describe("buildCreateSimulationBody", () => {
  it("builds a normalized body with linked ids and consent evidence", () => {
    const body = buildCreateSimulationBody(draft);

    expect(body).toEqual({
      applicant: {
        birthDate: "1990-05-10",
        document: "12345678909",
        email: "ana@example.com",
        monthlyIncomeCents: 850_000,
        name: "Ana Souza",
        phone: "5511987654321",
      },
      consent: {
        creditSimulation: true,
        personalData: true,
      },
      leadId: "lead_1",
      listingId: "listing_1",
      terms: {
        downPaymentCents: 3_000_000,
        installmentCount: 48,
        requestedBankCodes: ["001", "237"],
      },
      unitId: "unit_1",
      vehicle: {
        priceCents: 10_000_000,
        licensingCity: "São Paulo",
        licensingUf: "SP",
        manufactureYear: 2025,
        modelYear: 2026,
        molicarCode: "MOL123",
        zeroKm: false,
      },
    });
  });

  it("cannot send scope fields, even when smuggled into the draft", () => {
    for (const key of ["tenantId", "storeId", "externalStoreId"]) {
      const smuggled = { ...draft, [key]: "scope_123" };
      expect(() =>
        buildCreateSimulationBody(smuggled as CredereSimulationDraft),
      ).toThrowError(new RegExp(key));
    }

    const nested = {
      ...draft,
      vehicle: { ...draft.vehicle, storeId: "scope_123" },
    };
    expect(() =>
      buildCreateSimulationBody(nested as unknown as CredereSimulationDraft),
    ).toThrowError(/storeId/);
  });

  it("omits optional link ids instead of sending empty strings", () => {
    const body = buildCreateSimulationBody({
      ...draft,
      leadId: undefined,
      listingId: "  ",
      requestedBankCodes: undefined,
      unitId: undefined,
    });

    expect(body).not.toHaveProperty("leadId");
    expect(body).not.toHaveProperty("listingId");
    expect(body).not.toHaveProperty("unitId");
    expect(body).not.toHaveProperty("requestedBankCodes");
  });

  it("requires explicit consent evidence", () => {
    expect(() =>
      buildCreateSimulationBody({
        ...draft,
        consent: { ...consent, acceptedTerms: false },
      }),
    ).toThrowError(/consentimento/);

    expect(() =>
      buildCreateSimulationBody({
        ...draft,
        consent: { ...consent, acceptedAt: " " },
      }),
    ).toThrowError(/Consentimento/);
  });

  it("rejects an entry equal to or above the vehicle value", () => {
    expect(() =>
      buildCreateSimulationBody({ ...draft, downPaymentCents: 10_000_000 }),
    ).toThrowError(/entrada/);
  });

  it("requires Credere vehicle lookup data before building the provider request", () => {
    expect(() =>
      buildCreateSimulationBody({
        ...draft,
        vehicle: { ...draft.vehicle, molicarCode: " " },
      }),
    ).toThrowError(/Molicar/);

    expect(() =>
      buildCreateSimulationBody({
        ...draft,
        vehicle: { ...draft.vehicle, licensingUf: "" },
      }),
    ).toThrowError(/UF/);
  });
});

describe("createIdempotencyKey", () => {
  it("generates unique non-empty keys per deliberate submit", () => {
    const first = createIdempotencyKey();
    const second = createIdempotencyKey();

    expect(first).toMatch(/^credere-sim-.+/);
    expect(second).toMatch(/^credere-sim-.+/);
    expect(first).not.toBe(second);
  });

  it("honours an injected uuid source", () => {
    expect(createIdempotencyKey(() => "fixed-uuid")).toBe(
      "credere-sim-fixed-uuid",
    );
  });
});

describe("FORBIDDEN_SCOPE_KEYS", () => {
  it("covers the scope fields blocked by the security contract", () => {
    expect(FORBIDDEN_SCOPE_KEYS).toEqual(
      expect.arrayContaining(["tenantId", "storeId", "externalStoreId"]),
    );
  });
});
