import { describe, expect, it, vi } from "vitest";
import { createMemoryFiscalConnectionRepository } from "../../features/fiscal/adapters/memory/fiscalConnectionRepository.js";
import { requestSpedyFiscalArtifact } from "./spedyHttpFiscalArtifacts.js";
import { createSpedyHttpFiscalProviderGateway } from "./spedyHttpFiscalProviderGateway.js";

const env = {
  FISCAL_CREDENTIAL_ENCRYPTION_KEY: "configured",
  SPEDY_API_URL: "https://api.spedy.test/v1/",
  SPEDY_OWNER_API_KEY: "owner-key",
  SPEDY_RUNTIME_IMPLEMENTATION: "http",
  SPEDY_WEBHOOK_URL: "https://api.example.test/webhooks/spedy",
};

describe("Spedy official fiscal artifacts", () => {
  it.each([
    ["nfe", "pdf", "%PDF-1.7 official", "application/pdf"],
    ["nfse", "xml", '<?xml version="1.0"?><nfse />', "application/xml"],
  ] as const)(
    "downloads real %s %s bytes through the company credential",
    async (documentKind, format, body, contentType) => {
      const connectionRepository = await readyConnection();
      const fetcher = vi.fn<typeof fetch>(
        async () =>
          new Response(body, { headers: { "content-type": contentType } }),
      );
      const gateway = createSpedyHttpFiscalProviderGateway({
        connectionRepository,
        env,
        fetcher,
      });

      const artifact = await gateway.downloadDocumentArtifact({
        documentKind,
        format,
        providerDocumentId: "private_provider_id",
        storeId: "store_1",
        tenantId: "tenant_1",
      });

      expect(artifact.contentType).toBe(contentType);
      expect(new TextDecoder().decode(artifact.bytes)).toBe(body);
      expect(fetcher).toHaveBeenCalledWith(
        `https://api.spedy.test/v1/${
          documentKind === "nfe" ? "product" : "service"
        }-invoices/private_provider_id/${format}`,
        expect.objectContaining({
          headers: { "X-Api-Key": "company-key" },
          method: "GET",
          redirect: "error",
        }),
      );
    },
  );

  it("rejects a successful response that is not an official artifact", async () => {
    const connectionRepository = await readyConnection();
    const gateway = createSpedyHttpFiscalProviderGateway({
      connectionRepository,
      env,
      fetcher: vi.fn<typeof fetch>(
        async () =>
          new Response("<html>gateway error</html>", {
            headers: { "content-type": "text/html" },
          }),
      ),
    });

    await expect(
      gateway.downloadDocumentArtifact({
        documentKind: "nfe",
        format: "pdf",
        providerDocumentId: "private_provider_id",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).rejects.toMatchObject({ name: "FiscalArtifactUnavailableError" });
  });

  it("refuses redirects instead of forwarding the company credential", async () => {
    const connectionRepository = await readyConnection();
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(null, {
          headers: { location: "https://attacker.example/artifact.pdf" },
          status: 302,
        }),
    );
    const gateway = createSpedyHttpFiscalProviderGateway({
      connectionRepository,
      env,
      fetcher,
    });

    await expect(
      gateway.downloadDocumentArtifact({
        documentKind: "nfe",
        format: "pdf",
        providerDocumentId: "private_provider_id",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).rejects.toMatchObject({ name: "SpedyGatewayHttpError", status: 302 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: "error" });
  });

  it.each([
    ["https://api.spedy.test/v1/", "https://attacker.example/artifact.pdf"],
    ["http://api.spedy.test/v1/", "product-invoices/id/pdf"],
  ])(
    "rejects an untrusted artifact URL before attaching credentials",
    async (baseUrl, path) => {
      const fetcher = vi.fn<typeof fetch>();

      await expect(
        requestSpedyFiscalArtifact({
          apiKey: "must-not-leak",
          baseUrl,
          fetcher,
          format: "pdf",
          path,
        }),
      ).rejects.toMatchObject({ name: "SpedyGatewayConfigurationError" });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("cancels a chunked artifact as soon as it exceeds 25 MiB", async () => {
    const cancel = vi.fn();
    const chunk = new Uint8Array(13 * 1024 * 1024);
    chunk.set(new TextEncoder().encode("%PDF-1.7"));
    const stream = new ReadableStream<Uint8Array>({
      cancel,
      pull(controller) {
        controller.enqueue(chunk);
      },
    });
    const fetcher = vi.fn<typeof fetch>(async () => new Response(stream));

    await expect(
      requestSpedyFiscalArtifact({
        apiKey: "company-key",
        baseUrl: env.SPEDY_API_URL,
        fetcher,
        format: "pdf",
        path: "product-invoices/id/pdf",
      }),
    ).rejects.toMatchObject({ name: "FiscalArtifactUnavailableError" });
    expect(cancel).toHaveBeenCalledOnce();
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
