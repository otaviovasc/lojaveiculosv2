import { describe, expect, it, vi } from "vitest";
import { createMemoryFiscalConnectionRepository } from "../../features/fiscal/adapters/memory/fiscalConnectionRepository.js";
import { FiscalCredentialDecryptionError } from "./fiscalCredentialCodec.js";
import { createSpedyHttpFiscalProviderGateway } from "./spedyHttpFiscalProviderGateway.js";

const env = {
  FISCAL_CREDENTIAL_ENCRYPTION_KEY: "configured",
  SPEDY_API_URL: "https://api.spedy.test/v1/",
  SPEDY_OWNER_API_KEY: "owner-key",
  SPEDY_RUNTIME_IMPLEMENTATION: "http",
  SPEDY_WEBHOOK_URL:
    "https://api.example.test/api/v1/fiscal/webhooks/spedy/token",
};

describe("spedyHttpFiscalProviderGateway", () => {
  it("reports tenant connection requirements without using the owner key", async () => {
    const connectionRepository = createMemoryFiscalConnectionRepository();
    const gateway = createSpedyHttpFiscalProviderGateway({
      connectionRepository,
      env,
    });

    await expect(
      gateway.getProviderStatus({ storeId: "store_1", tenantId: "tenant_1" }),
    ).resolves.toMatchObject({
      configured: false,
      missingConfiguration: [
        "fiscal.companyId",
        "fiscal.companyApiKey",
        "fiscal.taxDefaultsConfirmation",
        "fiscal.connectionReady",
      ],
    });
  });

  it("reports an unreadable company key as degraded configuration", async () => {
    const connectionRepository = await readyConnection();
    connectionRepository.getCompanyApiKey = async () => {
      throw new FiscalCredentialDecryptionError();
    };
    const gateway = createSpedyHttpFiscalProviderGateway({
      connectionRepository,
      env,
    });

    await expect(
      gateway.getProviderStatus({ storeId: "store_1", tenantId: "tenant_1" }),
    ).resolves.toMatchObject({
      configured: false,
      missingConfiguration: ["fiscal.companyApiKeyUnreadable"],
    });
  });

  it("issues NF-e with the company API key and fixed Spedy v1 path", async () => {
    const connectionRepository = await readyConnection();
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "invoice_1", status: "authorized" }),
    );
    const gateway = createSpedyHttpFiscalProviderGateway({
      connectionRepository,
      env,
      fetcher,
    });

    await expect(
      gateway.issueDocument({
        documentKind: "nfe",
        documentType: "nfe",
        externalReference: "sale_1",
        integrationId: "local_document_1",
        metadata: {
          recipient: { document: "12345678000190", name: "Cliente" },
          vehicleNfePayload: {
            item: {
              code: "vehicle_1",
              description: "Veículo usado",
              ncm: "87032310",
              quantity: 1,
              totalAmount: 100_000,
              unit: "UN",
              unitAmount: 100_000,
            },
          },
        },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toMatchObject({
      providerDocumentId: "invoice_1",
      status: "authorized",
    });

    const [requestUrl, request] = fetcher.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://api.spedy.test/v1/product-invoices");
    expect(request?.method).toBe("POST");
    expect(new Headers(request?.headers).get("X-Api-Key")).toBe("company-key");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      integrationId: "local_document_1",
      operationNature: "Venda de veículo",
    });
  });

  it("reads status and cancels using kind-specific resources", async () => {
    const connectionRepository = await readyConnection();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ id: "service_1", status: "processing" }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "service_1", status: "cancelled" }),
      );
    const gateway = createSpedyHttpFiscalProviderGateway({
      connectionRepository,
      env,
      fetcher,
    });

    await gateway.syncDocumentStatus({
      documentKind: "nfse",
      providerDocumentId: "service_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    await gateway.cancelDocument({
      documentKind: "nfse",
      providerDocumentId: "service_1",
      reason: "Customer requested cancellation",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(fetcher.mock.calls[0]?.slice(0, 2)).toEqual([
      "https://api.spedy.test/v1/service-invoices/service_1",
      expect.objectContaining({ method: "GET" }),
    ]);
    expect(fetcher.mock.calls[1]?.slice(0, 2)).toEqual([
      "https://api.spedy.test/v1/service-invoices/service_1",
      expect.objectContaining({
        body: JSON.stringify({
          justification: "Customer requested cancellation",
        }),
        method: "DELETE",
      }),
    ]);
  });
});

async function readyConnection() {
  const repository = createMemoryFiscalConnectionRepository();
  await repository.upsert({
    companyApiKey: "company-key",
    companyId: "company_1",
    defaultsStatus: "confirmed",
    status: "ready",
    storeId: "store_1",
    taxDefaults: {
      nfe: {
        cfop: 5102,
        destination: "internal",
        isFinalCustomer: true,
        operationNature: "Venda de veículo",
        operationType: "outgoing",
        presenceType: "presence",
        purposeType: "normal",
      },
    },
    tenantId: "tenant_1",
    webhookRegisteredAt: new Date("2026-07-27T12:00:00.000Z"),
  });
  return repository;
}
