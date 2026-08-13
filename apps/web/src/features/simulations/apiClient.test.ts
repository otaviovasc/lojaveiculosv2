import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { createCredereApi, parseStoreStatus } from "./apiClient";
import type { CredereSimulationDraft } from "./types";

const draft: CredereSimulationDraft = {
  applicant: {
    cpfCnpj: "123.456.789-09",
    name: "Ana Souza",
    phone: "(11) 98765-4321",
  },
  consent: {
    acceptedTerms: true,
    acceptedAt: "2026-07-27T12:00:00.000Z",
    channel: "store_workspace",
    policyVersion: "v1",
  },
  downPaymentCents: 3_000_000,
  installments: [48],
  vehicle: {
    licensingCity: "São Paulo",
    licensingUf: "SP",
    manufactureYear: 2025,
    modelYear: 2026,
    molicarCode: "MOL123",
    priceCents: 10_000_000,
    zeroKm: false,
  },
};

describe("createCredereApi", () => {
  it("maps the store status without exposing an external Store-Id", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        configured: true,
        credereStoreId: "credere_ext_123",
        mappedStoreAlias: "Loja Centro Credere",
        tokenPreview: "tok_secret",
        usableBanks: [{ code: "001", name: "Banco Um", status: "active" }],
      }),
    );
    const api = createCredereApi({ auth: { storeSlug: "loja-centro" }, fetch });

    const status = await api.getStatus();

    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/financing/credere/status");
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      "x-store-slug": "loja-centro",
    });
    expect(status).toEqual({
      configured: true,
      mappedStoreAlias: "Loja Centro Credere",
      usableBanks: [{ code: "001", name: "Banco Um", status: "active" }],
    });
    expect(JSON.stringify(status)).not.toContain("credere_ext_123");
    expect(JSON.stringify(status)).not.toContain("tok_secret");
    expect(status).not.toHaveProperty("credereStoreId");
    expect(status).not.toHaveProperty("externalStoreId");
  });

  it("tolerates alternate wire keys while DTO names settle", () => {
    const parsed = parseStoreStatus({
      alias: "Agencia Matriz",
      banks: [{ bankCode: "237", bankName: "Banco Dois" }],
      isConfigured: false,
    });

    expect(parsed).toEqual({
      configured: false,
      mappedStoreAlias: "Agencia Matriz",
      usableBanks: [{ code: "237", name: "Banco Dois", status: null }],
    });
  });

  it("sends the Idempotency-Key header on deliberate simulation submits", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ status: "pending", uuid: "sim_1" }));
    const api = createCredereApi({ fetch });

    await api.createSimulation(draft, { idempotencyKey: "credere-sim-abc" });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("/api/v1/financing/credere/simulations");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "Idempotency-Key": "credere-sim-abc",
    });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("tenantId");
    expect(body).not.toHaveProperty("storeId");
    expect(body).not.toHaveProperty("externalStoreId");
    expect(body["applicant"]).toMatchObject({
      document: "12345678909",
      phone: "11987654321",
    });
    expect(body["consent"]).toEqual({
      creditSimulation: true,
      personalData: true,
    });
    expect(body["terms"]).toMatchObject({
      downPaymentCents: 3_000_000,
      installmentCounts: [48],
      processBankSuggestedConditions: true,
    });
  });

  it("posts the required-fields lookup and reads requirement groups", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        knownLead: true,
        missing_fields: ["monthly_income"],
        requirements: { lead: ["monthlyIncomeCents"], vehicle: [] },
      }),
    );
    const api = createCredereApi({ fetch });

    const required = await api.getRequiredFields({
      bankCodes: ["001", "237"],
      cpfCnpj: "123.456.789-09",
    });

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("/api/v1/financing/credere/required-fields");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      bankCodes: ["001", "237"],
      document: "12345678909",
    });
    expect(required).toEqual({
      applicant: null,
      applicantKnown: true,
      missingFields: ["monthly_income"],
      requirements: { lead: ["monthlyIncomeCents"], vehicle: [] },
    });
  });

  it("resolves exact FIPE candidates without exposing provider scope", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            brand: "VW",
            fipeCode: "005340-6",
            fuelType: "Flex",
            modelId: "model_1",
            molicarCode: "01906108-0",
            name: "Gol",
            version: "1.0 MPI",
            yearEnd: 2025,
            yearStart: 2020,
          },
        ],
        status: "ambiguous",
      }),
    );
    const api = createCredereApi({ fetch });

    await expect(
      api.resolveFipeVehicle({ fipeCode: "005340-6", modelYear: 2023 }),
    ).resolves.toMatchObject({ status: "ambiguous" });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "/api/v1/financing/credere/vehicle-models/resolve-fipe",
    );
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      fipeCode: "005340-6",
      modelYear: 2023,
    });
  });

  it("lists, gets and refreshes simulations through the settled routes", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/refresh")) {
          return jsonResponse({ inquiryId: "inquiry_1", status: "completed" });
        }
        if (url.endsWith("/simulations/sim_1")) {
          return jsonResponse({ status: "pending", uuid: "sim_1" });
        }
        return jsonResponse({
          simulations: [{ status: "failed", uuid: "sim_0" }],
        });
      });
    const api = createCredereApi({ fetch });

    const list = await api.listSimulations();
    const detail = await api.getSimulation("sim_1");
    const refreshed = await api.refreshSimulation("sim_1");

    expect(fetch.mock.calls[0]?.[0]).toBe(
      "/api/v1/financing/credere/simulations",
    );
    expect(fetch.mock.calls[1]?.[0]).toBe(
      "/api/v1/financing/credere/simulations/sim_1",
    );
    expect(fetch.mock.calls[2]?.[0]).toBe(
      "/api/v1/financing/credere/simulations/sim_1/refresh",
    );
    expect(fetch.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(list[0]).toMatchObject({ id: "sim_0", status: "failed" });
    expect(detail).toMatchObject({ id: "sim_1", status: "pending" });
    expect(refreshed).toMatchObject({
      id: "inquiry_1",
      status: "completed",
    });
  });

  it("surfaces a safe API error carrying the backend requestId", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse(
        {
          code: "CREDERE_PROVIDER_UNAVAILABLE",
          message: "credere upstream socket hang up fd 42",
          requestId: "req_123",
        },
        503,
      ),
    );
    const api = createCredereApi({ fetch });

    const caught = await api.getStatus().catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(AppApiError);
    const apiError = caught as AppApiError;
    expect(apiError.requestId).toBe("req_123");
    expect(apiError.code).toBe("CREDERE_PROVIDER_UNAVAILABLE");
    expect(apiError.userMessage).toBe(
      "Servico temporariamente indisponivel. Tente novamente em instantes.",
    );
    expect(apiError.userMessage).not.toContain("socket hang up");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
