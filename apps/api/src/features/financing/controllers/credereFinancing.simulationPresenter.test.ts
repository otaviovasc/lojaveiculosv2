import { describe, expect, it, vi } from "vitest";
import {
  createServices,
  createStoreApp,
  validSimulationBody,
} from "./credereFinancing.controller.testSupport.js";

describe("Credere financing simulation presenter", () => {
  it("redacts scope, provider mapping, document, and metadata on create", async () => {
    const services = createServices({
      store: { createSimulation: vi.fn(async () => rawInquiry()) },
    });

    const response = await requestSimulation(services);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(safeInquiry());
  });

  it("serializes live Date values and preserves provider outcome provenance", async () => {
    const services = createServices({
      store: {
        createSimulation: vi.fn(async () =>
          rawInquiry({
            completedAt: new Date("2026-07-27T13:00:00.000Z"),
            createdAt: new Date("2026-07-27T12:00:00.000Z"),
            providerRequestId: "provider_request_1",
            success: false,
            updatedAt: new Date("2026-07-27T13:00:00.000Z"),
          }),
        ),
      },
    });

    const response = await requestSimulation(services);

    expect(await response.json()).toMatchObject({
      completedAt: "2026-07-27T13:00:00.000Z",
      createdAt: "2026-07-27T12:00:00.000Z",
      providerRequestId: "provider_request_1",
      success: false,
      updatedAt: "2026-07-27T13:00:00.000Z",
    });
  });

  it("redacts scope and sibling data on list", async () => {
    const services = createServices({
      store: {
        listSimulations: vi.fn(async () => ({
          simulations: [rawInquiry({ id: "inquiry_list_1" })],
          storeId: "store_1",
          tenantId: "tenant_1",
        })),
      },
    });

    const response = await createStoreApp(services).request(
      "/api/v1/financing/credere/simulations",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      simulations: [safeInquiry({ inquiryId: "inquiry_list_1" })],
    });
  });

  it("redacts scope and provider fields on detail and refresh", async () => {
    const services = createServices({
      store: {
        getSimulation: vi.fn(async () => rawInquiry({ id: "inquiry_get_1" })),
        refreshSimulation: vi.fn(async () =>
          rawInquiry({ id: "inquiry_refresh_1" }),
        ),
      },
    });
    const app = createStoreApp(services);

    const detail = await app.request(
      "/api/v1/financing/credere/simulations/inquiry_get_1",
    );
    const refresh = await app.request(
      "/api/v1/financing/credere/simulations/inquiry_refresh_1/refresh",
      { method: "POST" },
    );

    expect(detail.status).toBe(200);
    expect(refresh.status).toBe(202);
    expect(await detail.json()).toEqual(
      safeInquiry({ inquiryId: "inquiry_get_1" }),
    );
    expect(await refresh.json()).toEqual(
      safeInquiry({ inquiryId: "inquiry_refresh_1" }),
    );
  });

  it("returns a stable 404 for missing detail and refresh inquiries", async () => {
    const services = createServices({
      store: {
        getSimulation: vi.fn(async () => null),
        refreshSimulation: vi.fn(async () => null),
      },
    });
    const app = createStoreApp(services);

    const detail = await app.request(
      "/api/v1/financing/credere/simulations/inquiry_missing",
    );
    const refresh = await app.request(
      "/api/v1/financing/credere/simulations/inquiry_missing/refresh",
      { method: "POST" },
    );

    expect(detail.status).toBe(404);
    expect(refresh.status).toBe(404);
    expect(await detail.json()).toMatchObject({
      code: "CREDERE_FINANCING_INQUIRY_NOT_FOUND",
    });
    expect(await refresh.json()).toMatchObject({
      code: "CREDERE_FINANCING_INQUIRY_NOT_FOUND",
    });
  });
});

function requestSimulation(services: ReturnType<typeof createServices>) {
  return createStoreApp(services).request(
    "/api/v1/financing/credere/simulations",
    {
      body: JSON.stringify(validSimulationBody()),
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "idem_presenter",
      },
      method: "POST",
    },
  );
}

function rawInquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: "inquiry_1",
    completedAt: "2026-07-27T13:00:00.000Z",
    conditions: [
      {
        id: "condition_1",
        bankCode: "655",
        bankName: "BV",
        installments: 24,
        metadata: {
          cpf: "52998224725",
          downPaymentCents: 200_000,
          firstInstallmentCents: 45_000,
          preApprovalStatus: 2,
          reasonIdentifier: "policy_approved",
        },
        providerStoreId: "credere_store_1",
        status: "available",
        summary: "Pre-approved",
        totalAmountCents: 1200000,
      },
    ],
    consentEvidence: { ipAddress: "127.0.0.1", termsVersion: "v1" },
    createdAt: "2026-07-27T12:00:00.000Z",
    customerDocumentHash: "doc_hash_secret",
    customerDocumentLast4: "4725",
    metadata: { siblingStoreId: "store_2" },
    leadId: "lead_1",
    listingId: "listing_1",
    providerStoreId: "credere_store_1",
    reason: "Provider accepted.",
    status: "completed",
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: "2026-07-27T13:00:00.000Z",
    ...overrides,
  };
}

function safeInquiry(overrides: Record<string, unknown> = {}) {
  return {
    inquiryId: "inquiry_1",
    completedAt: "2026-07-27T13:00:00.000Z",
    conditions: [
      {
        id: "condition_1",
        bankCode: "655",
        bankName: "BV",
        downPaymentCents: 200_000,
        firstInstallmentCents: 45_000,
        installments: 24,
        preApprovalStatus: 2,
        reasonIdentifier: "policy_approved",
        status: "available",
        summary: "Pre-approved",
        totalAmountCents: 1200000,
      },
    ],
    createdAt: "2026-07-27T12:00:00.000Z",
    leadId: "lead_1",
    listingId: "listing_1",
    reason: "Provider accepted.",
    status: "completed",
    unitId: "unit_1",
    updatedAt: "2026-07-27T13:00:00.000Z",
    ...overrides,
  };
}
