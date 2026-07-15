import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { FiscalDocument } from "../../../domains/fiscal/ports/fiscalRepository.js";
import {
  FiscalDocumentNotFoundError,
  FiscalProviderReferenceMissingError,
} from "../../../domains/fiscal/services/FiscalService/serviceSupport.js";
import { createFiscalFeature } from "./fiscal.controller.js";
import type { FiscalServices } from "./fiscalServices.js";

describe("fiscal controller persisted provider reference contract", () => {
  it("passes only the local document id and reason to cancellation", async () => {
    const services = createServices();
    const feature = createFiscalFeature({
      contextFactory: async () => createContext(),
      services: services.value,
    });

    const response = await feature.request("/documents/document_1/cancel", {
      body: JSON.stringify({
        reason: "Customer requested cancellation",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(services.cancelDocument).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { id: "user_1", kind: "user" } }),
      {
        documentId: "document_1",
        reason: "Customer requested cancellation",
      },
    );
  });

  it("passes only the local document id to status synchronization", async () => {
    const services = createServices();
    const feature = createFiscalFeature({
      contextFactory: async () => createContext(),
      services: services.value,
    });

    const response = await feature.request(
      "/documents/document_1/status-sync",
      {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(services.syncDocumentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { id: "user_1", kind: "user" } }),
      { documentId: "document_1" },
    );
  });

  it.each([
    [
      "/documents/document_1/cancel",
      { providerDocumentId: "untrusted", reason: "Cancel it" },
    ],
    ["/documents/document_1/status-sync", { providerDocumentId: "untrusted" }],
  ] as const)(
    "rejects legacy client provider references on %s",
    async (path, body) => {
      const services = createServices();
      const feature = createFiscalFeature({
        contextFactory: async () => createContext(),
        services: services.value,
      });

      const response = await feature.request(path, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "FISCAL_REQUEST_ERROR",
      });
      expect(services.cancelDocument).not.toHaveBeenCalled();
      expect(services.syncDocumentStatus).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      new FiscalDocumentNotFoundError("document_1"),
      404,
      "FISCAL_DOCUMENT_NOT_FOUND",
    ],
    [
      new FiscalProviderReferenceMissingError("document_1"),
      409,
      "FISCAL_PROVIDER_REFERENCE_MISSING",
    ],
  ] as const)("maps %s to %s/%s", async (error, status, code) => {
    const services = createServices();
    services.cancelDocument.mockRejectedValueOnce(error);
    const feature = createFiscalFeature({
      contextFactory: async () => createContext(),
      services: services.value,
    });

    const response = await feature.request("/documents/document_1/cancel", {
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
      headers: {
        "content-type": "application/json",
        "x-request-id": "request_1",
      },
      method: "POST",
    });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({
      code,
      requestId: "request_1",
    });
  });
});

function createContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["fiscal.manage"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createServices() {
  const cancelDocument = vi.fn<FiscalServices["cancelDocument"]>(
    async () => documentRecord,
  );
  const syncDocumentStatus = vi.fn<FiscalServices["syncDocumentStatus"]>(
    async () => documentRecord,
  );
  const value: FiscalServices = {
    archiveRecipient: unused("archiveRecipient"),
    archiveTemplate: unused("archiveTemplate"),
    cancelDocument,
    createRecipient: unused("createRecipient"),
    createTemplate: unused("createTemplate"),
    getOverview: unused("getOverview"),
    issueDocument: unused("issueDocument"),
    listRecipients: unused("listRecipients"),
    listTemplates: unused("listTemplates"),
    previewTemplate: unused("previewTemplate"),
    repeatDocument: unused("repeatDocument"),
    syncDocumentStatus,
    updateRecipient: unused("updateRecipient"),
    updateTemplate: unused("updateTemplate"),
  };
  return { cancelDocument, syncDocumentStatus, value };
}

const documentRecord: FiscalDocument = {
  accessKey: "access_key_1",
  createdAt: new Date("2026-07-12T12:00:00.000Z"),
  documentKind: "nfe",
  documentType: "nfe",
  id: "document_1",
  issuedAt: new Date("2026-07-12T12:00:00.000Z"),
  metadata: {},
  provider: "spedy",
  providerDocumentId: "persisted_provider_document",
  recipientId: null,
  status: "issued",
  storeId: "store_1",
  templateId: null,
  templateVersion: null,
  tenantId: "tenant_1",
};

function unused(name: string): never {
  return (async () => {
    throw new Error(`Unexpected ${name} call.`);
  }) as never;
}
