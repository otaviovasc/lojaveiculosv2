import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { FiscalProviderGateway } from "../../ports/fiscalProviderGateway.js";
import type {
  FiscalDocument,
  FiscalDocumentStatus,
  FiscalRepository,
} from "../../ports/fiscalRepository.js";
import { cancelFiscalDocument } from "./cancelFiscalDocument.js";
import { unexpectedCall } from "../../testSupport.js";
import {
  FiscalDocumentNotFoundError,
  FiscalProviderReferenceMissingError,
  FiscalScopeError,
  type FiscalServicePorts,
} from "./serviceSupport.js";

describe("cancelFiscalDocument", () => {
  it.each([
    ["cancelled", "cancelled", "succeeded"],
    ["failed", "failed", "failed"],
    ["issued", "issued", "succeeded"],
    ["processing", "processing", "succeeded"],
  ] as const)(
    "maps provider status %s to %s with %s audit outcome",
    async (providerStatus, expectedStatus, outcome) => {
      const harness = createHarness({ providerStatus });

      const result = await cancelFiscalDocument(
        createContext(harness.record),
        { documentId: "document_1", reason: "Customer requested cancellation" },
        harness.ports,
      );

      expect(harness.findDocumentById).toHaveBeenCalledWith({
        documentId: "document_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      expect(harness.cancelDocument).toHaveBeenCalledWith({
        providerDocumentId: "persisted_provider_document",
        reason: "Customer requested cancellation",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      expect(harness.updateDocumentStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: "document_1",
          metadata: {
            cancelReason: "Customer requested cancellation",
            providerStatus,
          },
          providerDocumentId: "persisted_provider_document",
          status: expectedStatus,
        }),
      );
      expect(harness.updateDocumentStatus.mock.calls[0]?.[0]).toHaveProperty(
        "providerDocumentId",
        "persisted_provider_document",
      );
      expect(harness.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "fiscal.document.cancel",
          criticality: "critical",
          outcome,
        }),
      );
      expect(result.status).toBe(expectedStatus);
    },
  );

  it("does not call the provider when the scoped document is absent", async () => {
    const harness = createHarness({ document: null });

    await expect(
      cancelFiscalDocument(
        createContext(harness.record),
        { documentId: "document_1", reason: "Customer requested cancellation" },
        harness.ports,
      ),
    ).rejects.toBeInstanceOf(FiscalDocumentNotFoundError);

    expect(harness.cancelDocument).not.toHaveBeenCalled();
    expect(harness.updateDocumentStatus).not.toHaveBeenCalled();
  });

  it("does not call the provider when the persisted provider reference is absent", async () => {
    const harness = createHarness({
      document: { ...documentRecord, providerDocumentId: null },
    });

    await expect(
      cancelFiscalDocument(
        createContext(harness.record),
        { documentId: "document_1", reason: "Customer requested cancellation" },
        harness.ports,
      ),
    ).rejects.toBeInstanceOf(FiscalProviderReferenceMissingError);

    expect(harness.cancelDocument).not.toHaveBeenCalled();
  });

  it("requires explicit store and tenant scope before repository access", async () => {
    const harness = createHarness();

    await expect(
      cancelFiscalDocument(
        createContext(harness.record, { storeId: null }),
        { documentId: "document_1", reason: "Customer requested cancellation" },
        harness.ports,
      ),
    ).rejects.toBeInstanceOf(FiscalScopeError);

    expect(harness.findDocumentById).not.toHaveBeenCalled();
  });

  it("requires the nfe entitlement before repository access", async () => {
    const harness = createHarness();

    await expect(
      cancelFiscalDocument(
        createContext(harness.record, { entitlements: [] }),
        { documentId: "document_1", reason: "Customer requested cancellation" },
        harness.ports,
      ),
    ).rejects.toThrow("Missing entitlement: nfe");

    expect(harness.findDocumentById).not.toHaveBeenCalled();
  });

  it("fails closed when critical cancellation audit persistence fails", async () => {
    const harness = createHarness();
    harness.record.mockRejectedValueOnce(new Error("audit unavailable"));

    await expect(
      cancelFiscalDocument(
        createContext(harness.record),
        { documentId: "document_1", reason: "Customer requested cancellation" },
        harness.ports,
      ),
    ).rejects.toThrow("audit unavailable");
  });
});

const documentRecord: FiscalDocument = {
  accessKey: "old_access_key",
  createdAt: new Date("2026-07-12T12:00:00.000Z"),
  documentKind: "nfe",
  documentType: "nfe",
  id: "document_1",
  issuedAt: new Date("2026-07-12T12:00:00.000Z"),
  metadata: { saleId: "sale_1" },
  provider: "spedy",
  providerDocumentId: "persisted_provider_document",
  recipientId: null,
  status: "issued",
  storeId: "store_1",
  templateId: null,
  templateVersion: null,
  tenantId: "tenant_1",
};

function createContext(
  record: ReturnType<typeof createHarness>["record"],
  overrides: {
    entitlements?: string[];
    storeId?: string | null;
  } = {},
) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record },
      permissions: ["fiscal.document.cancel", "fiscal.manage"],
      request: { requestId: "request_1" },
      storeId: overrides.storeId === undefined ? "store_1" : overrides.storeId,
      tenantId: "tenant_1",
    }),
    { entitlements: overrides.entitlements ?? ["nfe"] },
  );
}

function createHarness(
  overrides: {
    document?: FiscalDocument | null;
    providerStatus?: "cancelled" | "failed" | "issued" | "processing";
  } = {},
) {
  const document =
    overrides.document === undefined ? documentRecord : overrides.document;
  const record = vi.fn(async () => undefined);
  const cancelDocument = vi.fn<FiscalProviderGateway["cancelDocument"]>(
    async () => ({
      accessKey: "new_access_key",
      providerDocumentId: "persisted_provider_document",
      status: overrides.providerStatus ?? "cancelled",
    }),
  );
  const findDocumentById = vi.fn<FiscalRepository["findDocumentById"]>(
    async () => document,
  );
  const updateDocumentStatus = vi.fn<FiscalRepository["updateDocumentStatus"]>(
    async (input) => updatedDocument(documentRecord, input),
  );
  const ports: FiscalServicePorts = {
    fiscalProviderGateway: {
      cancelDocument,
      getProviderStatus: unexpectedCall("getProviderStatus"),
      issueDocument: unexpectedCall("issueDocument"),
      syncDocumentStatus: unexpectedCall("syncDocumentStatus"),
    },
    fiscalRepository: {
      createDocument: unexpectedCall("createDocument"),
      createDocumentSnapshot: async () => undefined,
      createRecipient: unexpectedCall("createRecipient"),
      createTemplate: unexpectedCall("createTemplate"),
      findDocumentById,
      getDocument: unexpectedCall("getDocument"),
      getOverview: unexpectedCall("getOverview"),
      getRecipient: unexpectedCall("getRecipient"),
      getTemplate: unexpectedCall("getTemplate"),
      listRecipients: unexpectedCall("listRecipients"),
      listTemplates: unexpectedCall("listTemplates"),
      updateDocumentStatus,
      updateRecipient: unexpectedCall("updateRecipient"),
      updateTemplate: unexpectedCall("updateTemplate"),
    },
  };
  return {
    cancelDocument,
    findDocumentById,
    ports,
    record,
    updateDocumentStatus,
  };
}

function updatedDocument(
  document: FiscalDocument,
  input: Parameters<FiscalRepository["updateDocumentStatus"]>[0],
): FiscalDocument {
  return {
    ...document,
    accessKey: input.accessKey ?? document.accessKey,
    metadata: input.metadata ?? document.metadata,
    status: input.status as FiscalDocumentStatus,
  };
}
