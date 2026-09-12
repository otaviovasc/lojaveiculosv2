import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { FiscalArtifactUnavailableError } from "../../../domains/fiscal/ports/fiscalProviderGateway.js";
import { createFiscalFeature } from "./fiscal.controller.js";
import type { FiscalServices } from "./fiscalServices.js";

describe("fiscal official artifact controller", () => {
  it("streams an official artifact without accepting a provider id", async () => {
    const services = createServices();
    const feature = createFiscalFeature({
      contextFactory: async () => createContext(),
      services: services.value,
    });

    const response = await feature.request(
      "/documents/document_1/artifacts/pdf",
      { headers: { "x-request-id": "request_1" } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="nfe-oficial-20260712.pdf"',
    );
    expect(services.downloadDocumentArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { id: "user_1", kind: "user" } }),
      { documentId: "document_1", format: "pdf" },
    );
    await expect(response.text()).resolves.toBe("%PDF-1.7 official");
  });

  it("rejects unsupported formats before calling the service", async () => {
    const services = createServices();
    const feature = createFiscalFeature({
      contextFactory: async () => createContext(),
      services: services.value,
    });

    const response = await feature.request(
      "/documents/document_1/artifacts/html",
      { headers: { "x-request-id": "request_1" } },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "FISCAL_REQUEST_ERROR",
      requestId: "request_1",
    });
    expect(services.downloadDocumentArtifact).not.toHaveBeenCalled();
  });

  it("maps unavailable artifacts without leaking provider details", async () => {
    const services = createServices();
    services.downloadDocumentArtifact.mockRejectedValueOnce(
      new FiscalArtifactUnavailableError("xml"),
    );
    const feature = createFiscalFeature({
      contextFactory: async () => createContext(),
      services: services.value,
    });

    const response = await feature.request(
      "/documents/document_1/artifacts/xml",
      { headers: { "x-request-id": "request_1" } },
    );

    expect(response.status).toBe(409);
    const payload: unknown = await response.json();
    expect(payload).toMatchObject({
      code: "FISCAL_ARTIFACT_UNAVAILABLE",
      requestId: "request_1",
    });
    expect(JSON.stringify(payload)).not.toContain("provider");
  });
});

function createContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["documents.download", "fiscal.manage"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createServices() {
  const downloadDocumentArtifact = vi.fn<
    FiscalServices["downloadDocumentArtifact"]
  >(async () => ({
    bytes: new TextEncoder().encode("%PDF-1.7 official"),
    contentType: "application/pdf",
    fileName: "nfe-oficial-20260712.pdf",
  }));
  const value: FiscalServices = {
    archiveRecipient: unused("archiveRecipient"),
    archiveTemplate: unused("archiveTemplate"),
    cancelDocument: unused("cancelDocument"),
    confirmDefaults: unused("confirmDefaults"),
    createRecipient: unused("createRecipient"),
    createTemplate: unused("createTemplate"),
    downloadDocumentArtifact,
    getConnection: unused("getConnection"),
    getOverview: unused("getOverview"),
    issueDocument: unused("issueDocument"),
    listRecipients: unused("listRecipients"),
    listTemplates: unused("listTemplates"),
    previewTemplate: unused("previewTemplate"),
    processWebhook: unused("processWebhook"),
    repeatDocument: unused("repeatDocument"),
    setupConnection: unused("setupConnection"),
    syncConnection: unused("syncConnection"),
    syncDocumentStatus: unused("syncDocumentStatus"),
    updateRecipient: unused("updateRecipient"),
    updateTemplate: unused("updateTemplate"),
    uploadCertificate: unused("uploadCertificate"),
  };
  return { downloadDocumentArtifact, value };
}

function unused(name: string): never {
  return (async () => {
    throw new Error(`Unexpected ${name} call.`);
  }) as never;
}
