import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createFiscalTestPorts } from "../../testSupport.js";
import {
  processSpedyWebhook,
  SpedyWebhookTokenError,
} from "./processSpedyWebhook.js";

describe("processSpedyWebhook", () => {
  it("re-fetches provider state and upserts the document for the store company", async () => {
    const ports = createFiscalTestPorts();
    await ports.fiscalConnectionRepository.upsert({
      companyApiKey: "company-key",
      companyId: "company_1",
      defaultsStatus: "confirmed",
      status: "ready",
      storeId: "store_1",
      tenantId: "tenant_1",
      webhookRegisteredAt: new Date(),
    });
    const auditRecord = vi.fn(async () => undefined);
    const context = createContext(auditRecord);

    const result = await processSpedyWebhook(
      context,
      {
        payload: {
          companyId: "company_1",
          eventId: "event_1",
          invoiceId: "invoice_1",
          invoiceType: "nfe",
          status: "authorized",
        },
        token: "valid-token",
      },
      ports,
    );
    expect(result).toMatchObject({ status: "processed" });
    await expect(
      ports.fiscalRepository.getDocument({
        documentId: result.documentId!,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toMatchObject({
      providerDocumentId: "invoice_1",
      status: "issued",
    });
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "fiscal.webhook.spedy.processed",
        outcome: "succeeded",
      }),
    );
  });

  it("parses the official Spedy envelope (data.id + data.model + top-level event id)", async () => {
    const ports = createFiscalTestPorts();
    await ports.fiscalConnectionRepository.upsert({
      companyApiKey: "company-key",
      companyId: "company_1",
      defaultsStatus: "confirmed",
      status: "ready",
      storeId: "store_1",
      tenantId: "tenant_1",
      webhookRegisteredAt: new Date(),
    });
    const context = createContext();

    const result = await processSpedyWebhook(
      context,
      {
        payload: {
          id: "event_9",
          event: "invoice.status_changed",
          data: {
            id: "invoice_9",
            model: "serviceInvoice",
            status: "authorized",
            company: { id: "company_1" },
          },
        },
        token: "valid-token",
      },
      ports,
    );
    expect(result).toMatchObject({ status: "processed" });
    await expect(
      ports.fiscalRepository.getDocument({
        documentId: result.documentId!,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toMatchObject({
      documentKind: "nfse",
      providerDocumentId: "invoice_9",
    });
  });

  it("rejects an invalid opaque token before recording the payload", async () => {
    const ports = createFiscalTestPorts();
    ports.fiscalProviderAdminGateway.verifyWebhookToken = () => false;

    await expect(
      processSpedyWebhook(
        createContext(),
        {
          payload: {
            companyId: "company_1",
            invoiceId: "invoice_1",
            invoiceType: "nfe",
          },
          token: "invalid-token",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(SpedyWebhookTokenError);
  });
});

function createContext(auditRecord = vi.fn(async () => undefined)) {
  return createServiceContext({
    actor: { id: "spedy", kind: "integration" },
    audit: { record: auditRecord },
    permissions: ["fiscal.webhook.ingest"],
    request: { requestId: "req_1" },
  });
}
