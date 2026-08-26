import { describe, expect, it, vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import {
  createUnavailableCredereFinancingServices,
  type CredereFinancingServices,
} from "../../financing/controllers/credereFinancingServices.js";
import { createExternalApiFeature } from "./externalApi.controller.js";

describe("external API Credere runtime", () => {
  it("preflights readiness without turning a CPF into a PII oracle", async () => {
    const getRequiredFields = vi.fn(async () => ({
      applicant: {
        birthDate: "1990-05-10",
        email: "ana@example.com",
        hasCnh: true,
        monthlyIncomeCents: 500_000,
        name: "Ana Silva",
        phone: "11999990000",
      },
      knownLead: true,
      missingFields: [],
      requirements: { "001": [] },
    }));
    const app = createCredereTestApp({
      getRequiredFields,
      getStatus: vi.fn(async () => ({
        configured: true,
        mappedStoreAlias: "Loja Centro",
        usableBanks: [{ code: "001", name: "Banco Um" }],
      })),
    });

    const response = await app.request("/financing/credere/preflight", {
      body: JSON.stringify({ bankCodes: ["001"], document: "529.982.247-25" }),
      headers: externalHeaders(),
      method: "POST",
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as unknown;
    expect(json).toMatchObject({
      data: {
        applicant: { knownLead: true, missingFields: [] },
        readiness: { configured: true, mappedStoreAlias: "Loja Centro" },
      },
    });
    expect(JSON.stringify(json)).not.toContain("ana@example.com");
    expect(JSON.stringify(json)).not.toContain("11999990000");
    expect(getRequiredFields).toHaveBeenCalledWith(expect.anything(), {
      bankCodes: ["001"],
      document: "52998224725",
    });
  });

  it("creates an official simulation with consent and idempotency", async () => {
    const createSimulation = vi.fn<
      CredereFinancingServices["store"]["createSimulation"]
    >(async () => ({
      conditions: [
        {
          bankCode: "001",
          bankName: "Banco Um",
          installments: 36,
          metadata: { firstInstallmentCents: 245_000 },
          status: "pre_approved",
        },
      ],
      inquiryId: "inq_1",
      leadId: "lead_1",
      status: "processing",
    }));
    const app = createCredereTestApp({ createSimulation });

    const response = await app.request("/financing/credere/simulations", {
      body: JSON.stringify(validSimulation()),
      headers: externalHeaders({ "Idempotency-Key": "credere-001" }),
      method: "POST",
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        conditions: [{ firstInstallmentCents: 245_000 }],
        inquiryId: "inq_1",
        leadId: "lead_1",
      },
    });
    const [, request] = createSimulation.mock.calls[0] ?? [];
    expect(request?.idempotencyKey).toBe("credere-001");
    expect(request?.payload).toMatchObject({
      consent: {
        creditSimulation: true,
        personalData: true,
      },
    });
  });

  it("reads one inquiry and returns a stable not-found error", async () => {
    const getSimulation = vi.fn(async () => null);
    const app = createCredereTestApp({ getSimulation });

    const response = await app.request(
      "/financing/credere/simulations/missing-inquiry",
      { headers: externalHeaders() },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "CREDERE_FINANCING_INQUIRY_NOT_FOUND",
    });
  });
});

function createCredereTestApp(
  store: Partial<CredereFinancingServices["store"]>,
) {
  const unavailable = createUnavailableCredereFinancingServices();
  return createExternalApiFeature({
    contextFactory: async () => integrationContext(),
    runtimeServices: {
      financing: {
        ...unavailable,
        store: { ...unavailable.store, ...store },
      },
    },
  });
}

function integrationContext(): ServiceContext {
  return {
    ...createServiceContext({
      actor: { id: "api_client_1", kind: "integration" },
      permissions: ["financing.simulation.create", "financing.simulation.read"],
      request: { requestId: "req_credere_api" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements: ["external_api", "financing"],
  } as ServiceContext;
}

function externalHeaders(extra: Record<string, string> = {}) {
  return {
    "content-type": "application/json",
    "x-api-key": "lv2_test_secret",
    ...extra,
  };
}

function validSimulation() {
  return {
    applicant: {
      document: "52998224725",
      name: "Ana Silva",
      phone: "11999990000",
    },
    consent: { creditSimulation: true, personalData: true },
    leadId: "lead_1",
    terms: { downPaymentCents: 2_000_000, installmentCounts: [24, 36] },
    vehicle: {
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2023,
      modelYear: 2024,
      molicarCode: "001234",
      priceCents: 9_000_000,
    },
  };
}
