import { describe, expect, it, vi } from "vitest";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createAgencyApp,
  createServices,
  createStoreApp,
  storeId,
  tenantId,
  validSimulationBody,
} from "./credereFinancing.controller.testSupport.js";

type SimulationServiceInput = { idempotencyKey: string; payload: unknown };

describe("Credere financing controller", () => {
  it("returns only local connection and mapping fields to agency users", async () => {
    const services = createServices({
      agency: {
        getConnection: vi.fn(async () => ({
          accessToken: "secret",
          connected: true,
          connectedAt: new Date("2026-07-27T10:00:00.000Z"),
          providerStores: [{ externalStoreId: "external_sibling" }],
          scopes: ["simulator", "proposals"],
          status: "connected",
          storeMappings: [
            {
              externalStoreAlias: "Loja Credere",
              externalStoreId: "external_1",
              secret: "hidden",
              storeId,
            },
          ],
        })),
      },
    });
    const response = await createAgencyApp(services).request(
      `/api/v1/agency/tenants/${tenantId}/financing/credere`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      configured: true,
      connected: true,
      connection: {
        connected: true,
        connectedAt: "2026-07-27T10:00:00.000Z",
        status: "connected",
      },
      storeMappings: [
        {
          externalStoreAlias: "Loja Credere",
          externalStoreId: "external_1",
          storeId,
        },
      ],
    });
  });

  it.each(["Store-Id", "storeId", "tenantId"])(
    "rejects forbidden simulation body field %s",
    async (field) => {
      const services = createServices();
      const response = await createStoreApp(services).request(
        "/api/v1/financing/credere/simulations",
        {
          body: JSON.stringify({
            ...validSimulationBody(),
            [field]: "external_or_sibling",
          }),
          headers: {
            "content-type": "application/json",
            "Idempotency-Key": "idem_1",
          },
          method: "POST",
        },
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "FINANCING_REQUEST_VALIDATION_FAILED",
      });
      expect(services.store.createSimulation).not.toHaveBeenCalled();
    },
  );

  it("requires an Idempotency-Key for simulations", async () => {
    const services = createServices();
    const response = await createStoreApp(services).request(
      "/api/v1/financing/credere/simulations",
      {
        body: JSON.stringify(validSimulationBody()),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "FINANCING_REQUEST_VALIDATION_FAILED",
      details: { header: "Idempotency-Key" },
    });
  });

  it("passes sanitized simulation input and idempotency to the service", async () => {
    const createSimulation = vi.fn(
      async (_context: ServiceContext, _input: SimulationServiceInput) => ({
        inquiryId: "inquiry_1",
        status: "processing",
      }),
    );
    const services = createServices({
      store: {
        createSimulation,
      },
    });
    const app = createStoreApp(services);

    const response = await app.request(
      "/api/v1/financing/credere/simulations",
      {
        body: JSON.stringify(validSimulationBody()),
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "idem_1",
        },
        method: "POST",
      },
    );

    expect(response.status).toBe(202);
    const [serviceContext, serviceInput] = createSimulation.mock.calls[0] as [
      ServiceContext,
      SimulationServiceInput,
    ];
    expect(serviceContext).toMatchObject({ storeId, tenantId });
    expect(serviceInput?.idempotencyKey).toBe("idem_1");
    expect(serviceInput?.payload).toMatchObject({
      applicant: { document: "52998224725" },
    });
  });

  it("returns store status without sibling or token metadata", async () => {
    const services = createServices({
      store: {
        getStatus: vi.fn(async () => ({
          configured: true,
          mappedStoreAlias: "Loja Credere",
          siblingMappings: [{ storeId: "store_2" }],
          tokenExpiresAt: "2026-08-01T00:00:00.000Z",
          usableBanks: [
            { code: "655", name: "BV", providerInternalId: "secret" },
          ],
        })),
      },
    });
    const app = createStoreApp(services);

    const response = await app.request("/api/v1/financing/credere/status");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      configured: true,
      mappedStoreAlias: "Loja Credere",
      usableBanks: [{ code: "655", name: "BV" }],
    });
  });

  it("uses only opaque callback state and safe JSON in tests", async () => {
    const services = createServices({
      oauth: {
        completeCallback: vi.fn(async () => ({ ok: true })),
      },
    });
    const app = createStoreApp(services);

    const response = await app.request(
      "/api/v1/financing/credere/oauth/callback?code=oauth_code&state=opaque_state&tenantId=tenant_bad&storeId=store_bad",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, provider: "credere" });
    expect(services.oauth.completeCallback).toHaveBeenCalledWith({
      code: "oauth_code",
      state: "opaque_state",
    });
  });

  it("maps provider errors without raw PII details", async () => {
    const services = createServices({
      store: {
        getRequiredFields: vi.fn(async () => {
          throw {
            code: "CREDERE_VALIDATION_FAILED",
            details: {
              cpf: "529.982.247-25",
              field: "document",
              providerBody: { cpf: "529.982.247-25" },
            },
            message: "Credere rejected the request.",
            status: 422,
          };
        }),
      },
    });
    const app = createStoreApp(services);

    const response = await app.request(
      "/api/v1/financing/credere/required-fields",
      {
        body: JSON.stringify({ document: "529.982.247-25" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "CREDERE_VALIDATION_FAILED",
      details: { field: "document" },
    });
  });
});
