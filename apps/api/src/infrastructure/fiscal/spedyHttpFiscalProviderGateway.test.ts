import { describe, expect, it, vi } from "vitest";
import {
  createSpedyHttpFiscalProviderGateway,
  getSpedyProviderStatus,
  SpedyGatewayConfigurationError,
} from "./spedyHttpFiscalProviderGateway.js";

const completeEnv = {
  SPEDY_API_TOKEN: "token",
  SPEDY_API_URL: "https://spedy.example.test/api/",
  SPEDY_CANCEL_PATH: "nfe/{providerDocumentId}/cancel",
  SPEDY_ISSUE_PATH: "nfe",
  SPEDY_RUNTIME_IMPLEMENTATION: "http",
  SPEDY_STATUS_PATH: "nfe/{providerDocumentId}/status",
  SPEDY_WEBHOOK_SECRET: "secret",
};

describe("getSpedyProviderStatus", () => {
  it("lists every required production gateway value", () => {
    expect(getSpedyProviderStatus({})).toEqual({
      configured: false,
      missingConfiguration: [
        "SPEDY_RUNTIME_IMPLEMENTATION",
        "SPEDY_API_URL",
        "SPEDY_API_TOKEN",
        "SPEDY_WEBHOOK_SECRET",
        "SPEDY_ISSUE_PATH or SPEDY_NFE_ISSUE_PATH/SPEDY_NFSE_ISSUE_PATH",
        "SPEDY_CANCEL_PATH",
        "SPEDY_STATUS_PATH",
      ],
      provider: "spedy",
      webhookConfigured: false,
    });
  });

  it("accepts an explicitly enabled HTTP gateway", () => {
    expect(getSpedyProviderStatus(completeEnv)).toEqual({
      configured: true,
      missingConfiguration: [],
      provider: "spedy",
      webhookConfigured: true,
    });
  });
});

describe("createSpedyHttpFiscalProviderGateway", () => {
  it("fails closed when issue is called without configuration", async () => {
    const gateway = createSpedyHttpFiscalProviderGateway({ env: {} });

    await expect(
      gateway.issueDocument({
        documentKind: "nfe",
        documentType: "nfe",
        externalReference: "sale_1",
        metadata: {},
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).rejects.toBeInstanceOf(SpedyGatewayConfigurationError);
  });

  it("posts fiscal issue payloads and maps common provider fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_key: "NFE_ACCESS_KEY",
          id: "spedy_doc_1",
          status: "authorized",
        }),
        { status: 201 },
      ),
    );
    const gateway = createSpedyHttpFiscalProviderGateway({
      env: completeEnv,
      fetcher,
    });

    await expect(
      gateway.issueDocument({
        documentKind: "nfe",
        documentType: "nfe",
        externalReference: "sale_1",
        metadata: { amountCents: 120000 },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual({
      accessKey: "NFE_ACCESS_KEY",
      providerDocumentId: "spedy_doc_1",
      rawResponse: {
        access_key: "NFE_ACCESS_KEY",
        id: "spedy_doc_1",
        status: "authorized",
      },
      status: "authorized",
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://spedy.example.test/api/nfe",
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("uses kind-specific issue paths when configured", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "spedy_doc_1", status: "created" }), {
        status: 201,
      }),
    );
    const gateway = createSpedyHttpFiscalProviderGateway({
      env: {
        ...completeEnv,
        SPEDY_ISSUE_PATH: undefined,
        SPEDY_NFE_ISSUE_PATH: "product-invoices",
        SPEDY_NFSE_ISSUE_PATH: "service-invoices",
      },
      fetcher,
    });

    await gateway.issueDocument({
      documentKind: "nfse",
      documentType: "nfse_service_commission",
      externalReference: "commission_1",
      metadata: {},
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://spedy.example.test/api/service-invoices",
    );
  });

  it("uses provider document id path templates for cancellation", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "cancelada" }), { status: 200 }),
      );
    const gateway = createSpedyHttpFiscalProviderGateway({
      env: completeEnv,
      fetcher,
    });

    await expect(
      gateway.cancelDocument({
        providerDocumentId: "doc/1",
        reason: "Erro de emissao",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toEqual({
      accessKey: null,
      providerDocumentId: "doc/1",
      rawResponse: { status: "cancelada" },
      status: "cancelled",
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://spedy.example.test/api/nfe/doc%2F1/cancel",
    );
  });
});
