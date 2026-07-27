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
