import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { FiscalProviderGateway } from "../../ports/fiscalProviderGateway.js";
import type {
  FiscalDocument,
  FiscalRepository,
} from "../../ports/fiscalRepository.js";
import {
  FiscalDocumentNotFoundError,
  FiscalProviderReferenceMissingError,
  type FiscalServicePorts,
} from "./serviceSupport.js";
import { syncFiscalDocumentStatus } from "./syncFiscalDocumentStatus.js";

describe("syncFiscalDocumentStatus", () => {
  it.each([
    ["cancelled", "cancelled", "succeeded"],
    ["failed", "failed", "failed"],
    ["issued", "issued", "succeeded"],
    ["processing", "processing", "succeeded"],
  ] as const)(
    "maps provider status %s to %s with %s audit outcome",
    async (providerStatus, expectedStatus, outcome) => {
      const harness = createHarness({ providerStatus });

      const result = await syncFiscalDocumentStatus(
        createContext(harness.record),
        { documentId: "document_1" },
        harness.ports,
      );

      expect(harness.findDocumentById).toHaveBeenCalledWith({
        documentId: "document_1",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      expect(harness.syncDocumentStatus).toHaveBeenCalledWith({
        providerDocumentId: "persisted_provider_document",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      expect(harness.updateDocumentStatus).toHaveBeenCalledWith({
        accessKey: "new_access_key",
        documentId: "document_1",
        metadata: { providerStatus },
        providerDocumentId: "persisted_provider_document",
        status: expectedStatus,
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      expect(harness.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "fiscal.document.status_sync",
          outcome,
        }),
      );
      expect(result.status).toBe(expectedStatus);
    },
  );

  it("does not call the provider for a document outside the current scope", async () => {
    const harness = createHarness({ document: null });

    await expect(
      syncFiscalDocumentStatus(
        createContext(harness.record),
        { documentId: "document_1" },
        harness.ports,
      ),
    ).rejects.toBeInstanceOf(FiscalDocumentNotFoundError);

    expect(harness.syncDocumentStatus).not.toHaveBeenCalled();
    expect(harness.updateDocumentStatus).not.toHaveBeenCalled();
  });

  it("does not call the provider without a persisted provider reference", async () => {
    const harness = createHarness({
      document: { ...documentRecord, providerDocumentId: null },
    });

    await expect(
      syncFiscalDocumentStatus(
        createContext(harness.record),
        { documentId: "document_1" },
        harness.ports,
      ),
    ).rejects.toBeInstanceOf(FiscalProviderReferenceMissingError);

    expect(harness.syncDocumentStatus).not.toHaveBeenCalled();
  });

  it("denies missing permission before repository or provider access", async () => {
    const harness = createHarness();

    await expect(
      syncFiscalDocumentStatus(
        createContext(harness.record, []),
        { documentId: "document_1" },
        harness.ports,
      ),
    ).rejects.toThrow("Missing permission: fiscal.manage");

    expect(harness.findDocumentById).not.toHaveBeenCalled();
    expect(harness.syncDocumentStatus).not.toHaveBeenCalled();
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
  permissions = ["fiscal.manage"],
) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: { record },
      permissions,
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["nfe"] },
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
  const syncDocumentStatus = vi.fn<FiscalProviderGateway["syncDocumentStatus"]>(
    async () => ({
      accessKey: "new_access_key",
      providerDocumentId: "persisted_provider_document",
      status: overrides.providerStatus ?? "issued",
    }),
  );
  const findDocumentById = vi.fn<FiscalRepository["findDocumentById"]>(
    async () => document,
  );
  const updateDocumentStatus = vi.fn<FiscalRepository["updateDocumentStatus"]>(
    async (input) => ({
      ...documentRecord,
      accessKey: input.accessKey ?? documentRecord.accessKey,
      status: input.status,
    }),
  );
  const ports: FiscalServicePorts = {
    fiscalProviderGateway: {
      cancelDocument: unused("cancelDocument"),
      getProviderStatus: unused("getProviderStatus"),
      issueDocument: unused("issueDocument"),
      syncDocumentStatus,
    },
    fiscalRepository: {
      createDocument: unused("createDocument"),
      createDocumentSnapshot: async () => undefined,
      createRecipient: unused("createRecipient"),
      createTemplate: unused("createTemplate"),
      findDocumentById,
      getDocument: unused("getDocument"),
      getOverview: unused("getOverview"),
      getRecipient: unused("getRecipient"),
      getTemplate: unused("getTemplate"),
      listRecipients: unused("listRecipients"),
      listTemplates: unused("listTemplates"),
      updateDocumentStatus,
      updateRecipient: unused("updateRecipient"),
      updateTemplate: unused("updateTemplate"),
    },
  };
  return {
    findDocumentById,
    ports,
    record,
    syncDocumentStatus,
    updateDocumentStatus,
  };
}

function unused(name: string): never {
  return (async () => {
    throw new Error(`Unexpected ${name} call.`);
  }) as never;
}
